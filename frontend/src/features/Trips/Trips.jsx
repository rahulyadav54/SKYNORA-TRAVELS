import React, { useState, useEffect } from "react";
import "./Trips.css";
import { Work, Search } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { getValue } from "../../Utils/LocalStorage";
import { BookingHotelCard } from "../../Components/BookingHotelCard";
import { BookingFlightCard } from "../../Components/BookingFlightCard";
import { EmptyCard } from "../../Components/EmptyCard";

export const Trips = () => {
  const navigate = useNavigate();
  const [select, setSelect] = useState(0);
  const [hotels, setHotels] = useState([]);
  const [flights, setFlights] = useState([]);

  useEffect(() => {
    getFlights();
    getHotels();
  }, []);

  const getFlights = async () => {
    try {
      const authToken = getValue("userToken");
      const response = await fetch(
        "http://localhost:8080/bookings/flights",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "content-type": "application/json",
          },
        }
      );
      const json = await response.json();
      if (json.success) {
        setFlights(json.data.bookings || []);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getHotels = async () => {
    try {
      const authToken = getValue("userToken");
      const response = await fetch(
        "http://localhost:8080/bookings/hotels",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "content-type": "application/json",
          },
        }
      );
      const json = await response.json();
      if (json.success) {
        setHotels(json.data.bookings || []);
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <>
      <div className="background" />
      <div className="myTripsContainer">
        <div className="titleContainer">
          <div className="upcomingTrips">
            <div className="upcomingTripsTabs">
              <div>
                <div
                  className="upcomingTripsContent"
                  onClick={() => setSelect(0)}
                >
                  <Work
                    style={{ color: "#52f4cd", marginRight: 10, fontSize: 25 }}
                  />
                  <p>HOTELS</p>
                </div>
                {select === 0 && <div className="tripsUnderline" />}
              </div>
              <div className="upcomingTripsSecTab">
                <div
                  className="upcomingTripsContent"
                  onClick={() => setSelect(1)}
                >
                  <Work
                    style={{ color: "#52f4cd", marginRight: 10, fontSize: 25 }}
                  />
                  <p>FLIGHTS</p>
                </div>
                {select === 1 && <div className="tripsUnderline" />}
              </div>
            </div>
          </div>
          <div className="inputSection">
            <input
              type="text"
              className="tripsInput"
              placeholder="Search for a booking"
            />
            <div className="search">
              <Search style={{ color: "#fff", fontSize: 25 }} />
            </div>
          </div>
        </div>
        <div className="tripsContainer">
          {select === 0 ? (
            <>
              {hotels.length === 0 ? (
                <EmptyCard />
              ) : (
                <>
                  {hotels.map((item) => {
                    return <BookingHotelCard key={item._id} item={item} />;
                  })}
                </>
              )}
            </>
          ) : (
            <>
              {flights.length === 0 ? (
                <EmptyCard />
              ) : (
                <>
                  {flights.map((item) => {
                    return <BookingFlightCard key={item._id} item={item} />;
                  })}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};
