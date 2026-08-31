import { USER_LOGIN_ERROR, USER_LOGIN_REQUEST, USER_LOGIN_SUCCESS, USER_LOGOUT, USER_SIGN_UP, USER_NAME } from "./auth.actionTypes";
import { initialState } from "./auth.constants";

export const authReducer = (state = initialState, { type, payload }) => {
    console.log(payload)
    switch (type) {
        case USER_LOGIN_REQUEST: {
            return {
                ...state,
                isLoading: true,
                error: false
            }
        }
        case USER_LOGIN_SUCCESS: {
            return {
                ...state,
                isUserLoggedIn: true,
                isLoading: false,
                error: false,
                ...payload
            }
        }
        case USER_LOGIN_ERROR: {
            return {
                ...state,
                isUserLoggedIn: false,
                isLoading: false,
                error: true
            }
        }
        case USER_LOGOUT: {
            return {
                ...state,
                isUserLoggedIn: false,
                userToken: ""
            }
        }
        case USER_SIGN_UP: {
            return {
                ...state,
                isUserLoggedIn: true,
                isLoading: false,
                error: false,
            }
        }
        case USER_NAME: {
            return {
                ...state,
                isUserLoggedIn: true,
                isLoading: false,
                error: false,
                userName: payload,
                ...payload
            }
        }
        default: {
            return { ...state };
        }
    }
}