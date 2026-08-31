import React from "react";
import MoneyIcon from "@mui/icons-material/Money";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import PhoneIphoneOutlinedIcon from "@mui/icons-material/PhoneIphoneOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import { useNavigate, useParams } from "react-router-dom";
import styles from "./flightpayment.module.css";
import payment from "../../imgs/payment.png";
import { useState } from "react";
import { Alert } from "@mui/material";
import { useSelector } from "react-redux";
import { getValue } from "../../Utils/LocalStorage";

export const FlightPayment = () => {
  const { loading, error, flight } = useSelector((state) => ({
    loading: state.flightBooking.loading,
    flight: state.flightBooking.flightBooking,
    error: state.flightBooking.error,
  }));
  const [select1, setSelect1] = useState(true);
  const [select2, setSelect2] = useState(false);
  const [select3, setSelect3] = useState(false);
  const [select4, setSelect4] = useState(false);
  const [select5, setSelect5] = useState(false);
  const [select6, setSelect6] = useState(false);
  const [UPI, setUPI] = useState("");
  const [seatNumber, setSeatNumber] = useState("");
  const [wrong, setWrong] = useState(false);
  const navigate = useNavigate();
  const { price } = useParams();

  const handle_button1 = (e) => {
    setSelect1(true);
    setSelect2(false);
    setSelect3(false);
    setSelect4(false);
    setSelect5(false);
    setSelect6(false);
  };

  const handlePayment = async () => {
    if (process.env.REACT_APP_ENABLE_PAYMENTS !== "true") {
      setWrong(true);
      console.warn("Payments are disabled. Enable REACT_APP_ENABLE_PAYMENTS in environment.");
      return;
    }
    if (!seatNumber) {
      setWrong(true);
      return;
    }
    if (UPI === "shreevali@ybl") {
      await bookFlight();
    } else {
      setUPI("");
      setWrong(true);
    }
  };

  const bookFlight = async () => {
    try {
      const authToken = getValue("userToken");
      const travelDate = new Date().toISOString().split("T")[0];

      const holdResponse = await fetch(
        "http://localhost:8080/bookings/flight/hold-seat",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            flightId: flight._id,
            travelDate,
            seatNumber,
          }),
        }
      );
      const holdJson = await holdResponse.json();
      if (!holdJson.success) {
        setWrong(true);
        return;
      }

      const confirmResponse = await fetch(
        "http://localhost:8080/bookings/flight/confirm",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            flightId: flight._id,
            travelDate,
            seatNumber,
            fare: Number(price),
          }),
        }
      );
      const confirmJson = await confirmResponse.json();
      if (confirmJson.success) {
        setWrong(false);
        navigate("/");
      } else {
        setWrong(true);
      }
    } catch (error) {
      console.log(error);
      setWrong(true);
    }
  };

  return (
    <div className={styles.mntBox}>
      <div className={styles.main_heading_choosing_payment}>
        <h2> Payment Options</h2>
      </div>
      <div className={styles.choose_payment_div}>
        <div className={styles.payment_mode}>
          <button
            id="1"
            onClick={handle_button1}
            className={
              select1
                ? styles.payment_mode_select_button
                : styles.payment_mode_button
            }
          >
            <MoneyIcon />
            <p className={styles.button_name}>UPI Payment</p>
          </button>
          <button
            id="2"
            className={
              select2
                ? styles.payment_mode_select_button
                : styles.payment_mode_button
            }
          >
            <CreditCardIcon />
            <p className={styles.button_name}>Credit card</p>
          </button>
          <button
            id="3"
            className={
              select3
                ? styles.payment_mode_select_button
                : styles.payment_mode_button
            }
          >
            {" "}
            <CreditCardIcon />
            <p className={styles.button_name}>Debit Card</p>
          </button>
          <button
            id="4"
            className={
              select4
                ? styles.payment_mode_select_button
                : styles.payment_mode_button
            }
          >
            <AccountBalanceWalletOutlinedIcon />
            <p className={styles.button_name}> Paytm/Payzapp/Wallets</p>
          </button>
          <button
            id="5"
            className={
              select5
                ? styles.payment_mode_select_button
                : styles.payment_mode_button
            }
          >
            <AccountBalanceIcon />{" "}
            <p className={styles.button_name}>Net Banking</p>
          </button>
          <button
            id="6"
            className={
              select6
                ? styles.payment_mode_select_button
                : styles.payment_mode_button
            }
          >
            <PaymentsOutlinedIcon />
            <p className={styles.button_name}> EMI/Pay Later</p>
          </button>
        </div>
        <div
          style={{
            padding: "2%",
            borderRadius: "5px",
          }}
        >
          <div>
            <p className={styles.para_cash}>Enter Seat Number</p>
            <input
              onChange={(e) => setSeatNumber(e.target.value)}
              type="text"
              className={styles.capche_input}
              placeholder="e.g. A1"
            ></input>
            <p className={styles.para_cash}>Enter UPI Id</p>
            <p>Make payment of ₹{price}/-</p>
          </div>
          <div className={styles.capche_div}>
            <div
              style={{
                display: "flex",
                gap: "2rem",
                flexDirection: "column",
              }}
            >
              <input
                onChange={(e) => setUPI(e.target.value)}
                type="text"
                className={styles.capche_input}
                placeholder="UPI ID"
              ></input>
              {wrong && (
                <Alert severity="error">
                  There is an error-kindly fill in correct UPI Id or seat number{" "}
                </Alert>
              )}
              <button onClick={handlePayment} className={styles.payPlease}>
                <p>VERIFY AND PAY</p>
              </button>
            </div>
          </div>

          <img className={styles.payment_img} src={payment} />
          <div style={{ marginTop: "50px", fontSize: "12px", width: "80%" }}>
            <b>
              By continuing to pay, I understand and agree with the privacy
              policy, the user agreement and terms of service of SKY NORA TRAVELS.
            </b>
          </div>
        </div>
      </div>
    </div>
  );
};
