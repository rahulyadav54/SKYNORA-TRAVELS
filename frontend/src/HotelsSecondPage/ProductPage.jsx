import React, { useEffect, useCallback } from "react";
import HeaderP from "./HeaderP";

import styleP from "./ProductPage.module.css";
import Card from "./Card";
import stylef from "./FilterC.module.css";
import FilterC from "./FilterC";
import { useDispatch, useSelector } from "react-redux";
import { addHotels, hotelError, hotelLoading } from "./hotelSlice";
import { useState } from "react";
import { CircularProgress } from "@mui/material";
import { Link, NavLink, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

function defaultDates() {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 7);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 2);
  const fmt = (d) => d.toISOString().slice(0, 10);
  return { checkIn: fmt(checkIn), checkOut: fmt(checkOut) };
}

const ProductPage = () => {
  const [searchParams] = useSearchParams();
  const [hotel, setHotel] = useState([]);
  const [dataSource, setDataSource] = useState(null);
  const [searchWarning, setSearchWarning] = useState("");
  const [activeCity, setActiveCity] = useState(searchParams.get("city") || "Bengaluru");
  let { loading, error, hotels } = useSelector((state) => ({
    loading: state.hotel.loading,
    error: state.hotel.error,
    hotels: state.hotel.hotelDetails,
  }));
  const dispatch = useDispatch();

  const loadCatalogue = useCallback(() => {
    dispatch(hotelLoading());
    fetch(`${API_BASE_URL}/hotels`)
      .then((r) => r.json())
      .then((r) => {
        dispatch(addHotels(r.data));
        setHotel(r.data);
        setDataSource(r.source || "catalogue");
        setSearchWarning(r.warning || "");
      })
      .catch(() => dispatch(hotelError()));
  }, [dispatch]);

  const searchHotels = useCallback((city) => {
    dispatch(hotelLoading());
    const dates = defaultDates();
    const checkIn = searchParams.get("checkIn") || dates.checkIn;
    const checkOut = searchParams.get("checkOut") || dates.checkOut;

    fetch(`${API_BASE_URL}/hotels/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city, checkIn, checkOut, adults: 1, rooms: 1, maxResults: 12 }),
    })
      .then((r) => r.json())
      .then((r) => {
        if (r.success) {
          dispatch(addHotels(r.data));
          setHotel(r.data);
          setDataSource(r.source);
          setSearchWarning(r.warning || "");
        } else {
          loadCatalogue();
        }
      })
      .catch(() => loadCatalogue());
  }, [dispatch, searchParams, loadCatalogue]);

  const getHotels = useCallback(() => {
    searchHotels(activeCity);
  }, [searchHotels, activeCity]);

  const handleFilter = (tag) => {
    if (tag === "Delhi") tag = "New Delhi";
    setActiveCity(tag);
    searchHotels(tag);
  };
  const handlePriceFilter = (name) => {
    console.log(name);
    if (name === "first") {
      const filterPrice = hotel.filter((item) => {
        console.log(item.price);
        return item.price <= 7000;
      });
      setHotel(filterPrice);
    }
    if (name === "second") {
      const filterPrice = hotel.filter((item) => {
        return item.price >= 7000 && item.price <= 8000;
      });
      setHotel(filterPrice);
    }
    if (name === "third") {
      const filterPrice = hotel.filter((item) => {
        return item.price >= 8000 && item.price <= 10000;
      });
      setHotel(filterPrice);
    }
  };
  useEffect(() => {
    getHotels();
  }, [getHotels]);
  return (
    <>
      {loading ? (
        <div style={{ width: "100px", margin: "auto" }}>
          <CircularProgress />
        </div>
      ) : error ? (
        <h1>Something Went Wrong</h1>
      ) : (
        <>
          <div className={styleP.BigContainer}>
            <HeaderP />
            {dataSource && (
              <div style={{ padding: "8px 16px", fontSize: "13px", color: dataSource === "catalogue_fallback" ? "#b45309" : "#0d9488" }}>
                {dataSource === "live" || dataSource === "mock"
                  ? `✓ Live hotel search — ${activeCity} (${dataSource})`
                  : dataSource === "catalogue_fallback"
                    ? `⚠ Catalogue fallback for ${activeCity}${searchWarning ? ` — ${searchWarning}` : ""}`
                    : `Showing catalogue hotels`}
              </div>
            )}
            <div className={styleP.All_product}>
              <>
                <div className={stylef.Fcontainer}>
                  <h2>Select Filters</h2>

                  <h4>City Suggestions</h4>
                  <div
                    className={stylef.suggestGoadiv}
                    onChange={(e) => handleFilter(e.target.name)}
                  >
                    <div className={stylef.boxdiv}>
                      <div className={stylef.checkboxdiv}>
                        <input name={"Delhi"} type="checkbox" value="Bike" />
                        <span>Delhi</span>
                      </div>

                      <div className={stylef.vlaue}></div>
                    </div>

                    <div className={stylef.boxdiv}>
                      <div className={stylef.checkboxdiv}>
                        <input
                          type="checkbox"
                          name={"Bengaluru"}
                          value="Bike"
                        />
                        <span>Bengaluru</span>
                      </div>

                      <div className={stylef.vlaue}></div>
                    </div>

                    <div className={stylef.boxdiv}>
                      <div className={stylef.checkboxdiv}>
                        <input type="checkbox" name={"Mumbai"} value="Bike" />
                        <span>Mumbai</span>
                      </div>

                      <div className={stylef.vlaue}></div>
                    </div>
                  </div>

                  <h4>Suggested For You </h4>

                  <div className={stylef.suggestGoadiv}>
                    <div className={stylef.boxdiv}>
                      <div className={stylef.checkboxdiv}>
                        <input type="checkbox" name="vehicle1" value="Bike" />
                        <span>Excellent Ratings</span>
                      </div>

                      <div className={stylef.vlaue}></div>
                    </div>

                    <div className={stylef.boxdiv}>
                      <div className={stylef.checkboxdiv}>
                        <input type="checkbox" name="vehicle1" value="Bike" />
                        <span>5 Star Properties</span>
                      </div>

                      <div className={stylef.vlaue}></div>
                    </div>
                    <div className={stylef.boxdiv}>
                      <div className={stylef.checkboxdiv}>
                        <input type="checkbox" name="vehicle1" value="Bike" />
                        <span>North </span>
                      </div>

                      <div className={stylef.vlaue}></div>
                    </div>
                    <div className={stylef.boxdiv}>
                      <div className={stylef.checkboxdiv}>
                        <input type="checkbox" name="vehicle1" value="Bike" />
                        <img
                          src="https://promos.makemytrip.com/Hotels_product/Contextual%20Filter/Icons/Homestay_big_icon.png"
                          alt="not found"
                          className={stylef.iconhome}
                        />
                        <span>Entire Property</span>
                      </div>

                      <div className={stylef.vlaue}></div>
                    </div>

                    <div className={stylef.boxdiv}>
                      <div className={stylef.checkboxdiv}>
                        <input type="checkbox" name="vehicle1" value="Bike" />
                        <span>Swimming Pool</span>
                      </div>

                      <div className={stylef.vlaue}></div>
                    </div>

                    <div className={stylef.boxdiv}>
                      <div className={stylef.checkboxdiv}>
                        <input type="checkbox" name="" value="" />
                        <img
                          src="https://promos.makemytrip.com/Hotels_product/Contextual%20Filter/Icons/Homestay_big_icon.png"
                          alt="not found"
                          className={stylef.iconhome}
                        />
                        <span>Villas</span>
                      </div>

                      <div className={stylef.vlaue}></div>
                    </div>

                    <div className={stylef.boxdiv}>
                      <div className={stylef.checkboxdiv}>
                        <input type="checkbox" name="vehicle1" value="Bike" />
                        <span>Rated Excellent on Location</span>
                      </div>

                      <div className={stylef.vlaue}></div>
                    </div>

                    <div className={stylef.boxdiv}>
                      <div className={stylef.checkboxdiv}>
                        <input type="checkbox" name="vehicle1" value="Bike" />
                        <span>Free Breakfast</span>
                      </div>

                      <div className={stylef.vlaue}></div>
                    </div>

                    <div className={stylef.boxdiv}>
                      <div className={stylef.checkboxdiv}>
                        <input type="checkbox" name="vehicle1" value="Bike" />
                        <span>MMT Value Stays</span>
                      </div>

                      <div className={stylef.vlaue}></div>
                    </div>
                    <h4>Price</h4>

                    {/* 1 */}
                    <div
                      className={stylef.boxdiv}
                      onChange={(e) => handlePriceFilter(e.target.name)}
                    >
                      <div className={stylef.checkboxdiv}>
                        <input type="checkbox" name="first" value="Bike" />
                        <span> ₹ 0 - ₹ 7000 </span>
                      </div>

                      <div className={stylef.vlaue}></div>
                    </div>
                    {/*  2*/}
                    <div
                      className={stylef.boxdiv}
                      onChange={(e) => handlePriceFilter(e.target.name)}
                    >
                      <div className={stylef.checkboxdiv}>
                        <input type="checkbox" name="second" value="Bike" />
                        <span> ₹ 7000 - ₹ 8000 </span>
                      </div>

                      <div className={stylef.vlaue}></div>
                    </div>
                    {/* 3 */}
                    <div
                      className={stylef.boxdiv}
                      onChange={(e) => handlePriceFilter(e.target.name)}
                    >
                      <div className={stylef.checkboxdiv}>
                        <input type="checkbox" name="third" value="Bike" />
                        <span> ₹ 8000 - ₹ 10000 </span>
                      </div>

                      <div className={stylef.vlaue}></div>
                    </div>
                  </div>
                </div>
              </>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {hotel.map((item) => (
                  <React.Fragment key={item._id}>
                    <Card {...item} />
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default ProductPage;

