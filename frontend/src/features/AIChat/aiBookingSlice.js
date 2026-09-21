import { createSlice } from "@reduxjs/toolkit";
import { getValue, updateValue } from "../../Utils/LocalStorage";

const load = () => getValue("aiBookingCart") || { selectedFlight: null, selectedHotel: null, tripContext: null };

const initialState = {
  ...load(),
  loading: false,
  error: false,
};

export const aiBookingSlice = createSlice({
  name: "aiBooking",
  initialState,
  reducers: {
    selectAiFlight: (state, action) => {
      state.selectedFlight = action.payload;
      updateValue("aiBookingCart", {
        selectedFlight: state.selectedFlight,
        selectedHotel: state.selectedHotel,
        tripContext: state.tripContext,
      });
    },
    selectAiHotel: (state, action) => {
      state.selectedHotel = action.payload;
      updateValue("aiBookingCart", {
        selectedFlight: state.selectedFlight,
        selectedHotel: state.selectedHotel,
        tripContext: state.tripContext,
      });
    },
    setTripContext: (state, action) => {
      state.tripContext = action.payload;
      updateValue("aiBookingCart", {
        selectedFlight: state.selectedFlight,
        selectedHotel: state.selectedHotel,
        tripContext: state.tripContext,
      });
    },
    clearAiBooking: (state) => {
      state.selectedFlight = null;
      state.selectedHotel = null;
      state.tripContext = null;
      updateValue("aiBookingCart", null);
    },
  },
});

export const { selectAiFlight, selectAiHotel, setTripContext, clearAiBooking } = aiBookingSlice.actions;
export default aiBookingSlice.reducer;
