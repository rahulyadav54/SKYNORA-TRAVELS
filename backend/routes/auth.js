const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authMiddleware = require("../middleware/authMiddleware");

let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    const twilio = require("twilio");
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  } catch (e) {
    twilioClient = null;
  }
}

const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET_KEY;

const sendAuthResponse = (res, statusCode, message, data = null) => {
  res.status(statusCode).json({
    success: statusCode < 400,
    message,
    data,
    status: statusCode,
  });
};

const generateTokens = async (user) => {
  const data = { user: { id: user._id } };
  const accessToken = jwt.sign(data, process.env.JWT_SECRET_KEY, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign(data, REFRESH_TOKEN_SECRET, {
    expiresIn: "7d",
  });
  user.refreshTokens = user.refreshTokens || [];
  user.refreshTokens.push(refreshToken);
  await user.save();
  return { accessToken, refreshToken };
};

router.post(
  "/register",
  [
    body("name", "Please enter a name").notEmpty().trim(),
    body("email", "Please enter a valid email").isEmail().normalizeEmail(),
    body("password", "Password must be at least 8 characters and contain at least one letter and one number")
      .isLength({ min: 8 })
      .matches(/^(?=.*[A-Za-z])(?=.*\d)/),
    body("phone", "Please enter a valid phone number").notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendAuthResponse(res, 400, errors.array()[0].msg);
    }

    try {
      const { name, email, password, phone, mobile_number } = req.body;

      const existingUser = await User.findOne({
        $or: [{ email }, { phone }, { mobile_number }],
      });
      if (existingUser) {
        return sendAuthResponse(res, 409, "User already exists with this email or phone");
      }

      const salt = await bcrypt.genSalt(10);
      const secPass = await bcrypt.hash(password, salt);

      const user = await User.create({
        name,
        email,
        password: secPass,
        phone: phone || mobile_number,
        mobile_number: mobile_number || phone,
      });

      const { accessToken, refreshToken } = await generateTokens(user);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

          sendAuthResponse(res, 201, "User registered successfully", {
            user: user.toJSON(),
            accessToken,
            refreshToken,
          });
    } catch (error) {
      sendAuthResponse(res, 500, "Internal Server Error");
    }
  }
);

router.post(
  "/login",
  [
    body("identifier", "Please enter email or phone").notEmpty(),
    body("password", "Password cannot be blank").exists(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendAuthResponse(res, 400, errors.array()[0].msg);
    }

    const { identifier, password } = req.body;
    try {
      const user = await User.findOne({
        $or: [
          { email: identifier },
          { phone: identifier },
          { mobile_number: identifier },
        ],
      }).select("+password");

      if (!user) {
        return sendAuthResponse(res, 400, "Invalid credentials");
      }

      const passwordCompare = await bcrypt.compare(password, user.password);
      if (!passwordCompare) {
        return sendAuthResponse(res, 400, "Invalid credentials");
      }

      const { accessToken, refreshToken } = await generateTokens(user);

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      sendAuthResponse(res, 200, "Login successful", {
        user: user.toJSON(),
        accessToken,
        refreshToken,
      });
    } catch (error) {
      sendAuthResponse(res, 500, "Internal Server Error");
    }
  }
);

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return sendAuthResponse(res, 404, "User not found");
    }
    sendAuthResponse(res, 200, "User fetched successfully", { user: user.toJSON() });
  } catch (error) {
    sendAuthResponse(res, 500, "Internal Server Error");
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const token = req.cookies?.refreshToken || req.body.refreshToken;
    if (!token) {
      return sendAuthResponse(res, 401, "No refresh token provided");
    }

    let payload;
    try {
      payload = jwt.verify(token, REFRESH_TOKEN_SECRET);
    } catch (err) {
      return sendAuthResponse(res, 401, "Invalid refresh token");
    }

    const user = await User.findById(payload.user.id);
    if (!user || !user.refreshTokens?.includes(token)) {
      return sendAuthResponse(res, 401, "Refresh token revoked");
    }

    const data = { user: { id: user._id } };
    const accessToken = jwt.sign(data, process.env.JWT_SECRET_KEY, {
      expiresIn: "15m",
    });

    sendAuthResponse(res, 200, "Token refreshed", { accessToken });
  } catch (err) {
    sendAuthResponse(res, 500, "Internal Server Error");
  }
});

router.post("/logout", authMiddleware, async (req, res) => {
  try {
    const token = req.cookies?.refreshToken || req.body.refreshToken;
    if (token) {
      try {
        const payload = jwt.verify(token, REFRESH_TOKEN_SECRET);
        const user = await User.findById(payload.user.id);
        if (user && user.refreshTokens) {
          user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
          await user.save();
        }
      } catch (err) {
        // token invalid, just clear cookie
      }
    }
    res.clearCookie("refreshToken");
    sendAuthResponse(res, 200, "Logged out successfully");
  } catch (err) {
    sendAuthResponse(res, 500, "Internal Server Error");
  }
});

router.get("/getuser", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return sendAuthResponse(res, 404, "User not found");
    }
    sendAuthResponse(res, 200, "User fetched successfully", { user: user.toJSON() });
  } catch (error) {
    sendAuthResponse(res, 500, "Internal Server Error");
  }
});

router.put("/edituser", authMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user.id, req.body, { new: true });
    sendAuthResponse(res, 200, "User updated successfully", { user: user.toJSON() });
  } catch (error) {
    sendAuthResponse(res, 500, "Internal Server Error");
  }
});

router.post(
  "/otplogin",
  [
    body("mobile_number", "Please enter a valid mobile number").isLength({
      min: 10,
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendAuthResponse(res, 400, errors.array()[0].msg);
    }

    const { mobile_number } = req.body;
    try {
      const user = await User.findOne({ mobile_number });
      if (!user) {
        return sendAuthResponse(res, 401, "Mobile number is not registered");
      }

      if (!twilioClient || !process.env.TWILIO_SERVICE_SID) {
        return sendAuthResponse(res, 501, "OTP service not configured");
      }

      twilioClient.verify
        .services(process.env.TWILIO_SERVICE_SID)
        .verifications.create({
          to: `+91${mobile_number}`,
          channel: "sms",
        })
        .then((data) => {
          sendAuthResponse(res, 200, "OTP sent successfully", { data });
        })
        .catch((err) => {
          sendAuthResponse(res, 400, "Error sending OTP");
        });
    } catch (error) {
      sendAuthResponse(res, 500, "Internal Server Error");
    }
  }
);

router.post(
  "/otpverify",
  [body("code", "OTP must be 4 digits").isLength({ min: 4, max: 4 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendAuthResponse(res, 400, errors.array()[0].msg);
    }

    const { code } = req.body;
    const { mobile_number } = req.query;
    try {
      const user = await User.findOne({ mobile_number });
      if (!user) {
        return sendAuthResponse(res, 400, "User not found");
      }

      if (!twilioClient || !process.env.TWILIO_SERVICE_SID) {
        return sendAuthResponse(res, 501, "OTP service not configured");
      }

      twilioClient.verify
        .services(process.env.TWILIO_SERVICE_SID)
        .verificationChecks.create({
          to: `+91${mobile_number}`,
          code: code,
        })
        .then(async (message) => {
          if (message.status !== "approved") {
            return sendAuthResponse(res, 400, "Invalid OTP");
          }

          const { accessToken, refreshToken } = await generateTokens(user);

          res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
          });

          sendAuthResponse(res, 200, "OTP verified successfully", {
            user: user.toJSON(),
            accessToken,
            refreshToken,
          });
        })
        .catch((err) => {
          sendAuthResponse(res, 400, "Invalid OTP");
        });
    } catch (error) {
      sendAuthResponse(res, 500, "Internal Server Error");
    }
  }
);

module.exports = router;
