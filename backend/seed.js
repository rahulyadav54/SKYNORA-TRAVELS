const mongoose = require("mongoose");
const Hotel = require("./models/hotels.model");
const Flight = require("./schema/flightSchema/flightSchema");
require("dotenv").config();

const hotelsData = [
  {
    name: "Sky Nora Luxury Resort",
    ratings: 5,
    location: "Goa",
    country: "India",
    price: 8500,
    cover: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
    extraimageUrl: [
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=600&q=80"
    ]
  },
  {
    name: "Taj Mahal Palace",
    ratings: 5,
    location: "Mumbai",
    country: "India",
    price: 18000,
    cover: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80",
    extraimageUrl: [
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80"
    ]
  },
  {
    name: "The Oberoi Grand",
    ratings: 4.8,
    location: "Kolkata",
    country: "India",
    price: 12000,
    cover: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80",
    extraimageUrl: []
  },
  {
    name: "Radisson Blu Resort",
    ratings: 4.5,
    location: "Udaipur",
    country: "India",
    price: 9500,
    cover: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80",
    extraimageUrl: []
  }
];

const flightsData = [
  {
    name: "IndiGo",
    departure_time: "06:00",
    arrival_time: "08:15",
    duration: "02 h 15 m",
    fare: 5400,
    stops: "Non stop",
    departure: "Delhi",
    arrival: "Mumbai",
    flight_details: {
      baggage: "ADULT",
      checkin: "15 Kgs (1 piece only)",
      cabin: "7 Kgs (1 piece only)"
    }
  },
  {
    name: "Air India",
    departure_time: "14:30",
    arrival_time: "17:45",
    duration: "03 h 15 m",
    fare: 6800,
    stops: "Non stop",
    departure: "Delhi",
    arrival: "Bengaluru",
    flight_details: {
      baggage: "ADULT",
      checkin: "25 Kgs (1 piece only)",
      cabin: "8 Kgs (1 piece only)"
    }
  },
  {
    name: "SpiceJet",
    departure_time: "18:20",
    arrival_time: "20:30",
    duration: "02 h 10 m",
    fare: 4900,
    stops: "Non stop",
    departure: "Mumbai",
    arrival: "Goa",
    flight_details: {
      baggage: "ADULT",
      checkin: "15 Kgs (1 piece only)",
      cabin: "7 Kgs (1 piece only)"
    }
  },
  {
    name: "Vistara",
    departure_time: "09:15",
    arrival_time: "11:45",
    duration: "02 h 30 m",
    fare: 7500,
    stops: "Non stop",
    departure: "Bengaluru",
    arrival: "Delhi",
    flight_details: {
      baggage: "ADULT",
      checkin: "15 Kgs (1 piece only)",
      cabin: "7 Kgs (1 piece only)"
    }
  }
];

const seed = async () => {
  try {
    const dbUrl = process.env.MONGOOSE_DB_URL;
    if (!dbUrl) {
      console.error("MONGOOSE_DB_URL is not configured in environment variables");
      process.exit(1);
    }

    await mongoose.connect(dbUrl);
    
    console.log("Clearing existing data...");
    await Hotel.deleteMany({});
    await Flight.deleteMany({});
    
    console.log("Inserting hotels...");
    await Hotel.insertMany(hotelsData);
    
    console.log("Inserting flights...");
    await Flight.insertMany(flightsData);
    
    console.log("Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seed();
