import { USER_LOGIN_SUCCESS, USER_LOGOUT, USER_SIGN_UP, USER_NAME } from "../features/auth/auth.actionTypes";
import { updateValue } from "../Utils/LocalStorage";

const localStorageMiddleware = (store) => (next) => (action) => {
  const result = next(action);
  try {
    switch (action.type) {
      case USER_LOGIN_SUCCESS:
        if (action.payload && action.payload.data && action.payload.data.accessToken) {
          updateValue("userToken", action.payload.data.accessToken);
        }
        break;
      case USER_SIGN_UP:
        if (action.payload && action.payload.data && action.payload.data.accessToken) {
          updateValue("userToken", action.payload.data.accessToken);
        }
        break;
      case USER_NAME:
        if (action.payload) {
          updateValue("userName", action.payload);
        }
        break;
      case USER_LOGOUT:
        updateValue("userToken", "");
        updateValue("userName", "");
        break;
      default:
        break;
    }
  } catch (e) {
    console.error("localStorageMiddleware error", e);
  }
  return result;
};

export default localStorageMiddleware;
