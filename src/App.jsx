import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "/api";
const STUDENT_ID = "cmutjdrzy0001pgf6h68o09v5";

const instruments = [
  {
    name: "Piano",
    icon: "\u{1F3B9}",
    text: "Beginner to advanced",
  },
  {
    name: "Violin",
    icon: "\u{1F3BB}",
    text: "Classical & modern",
  },
  {
    name: "Vocal",
    icon: "\u{1F3A4}",
    text: "Voice & performance",
  },
];

const safeArray = (value) =>
  Array.isArray(value) ? value : [];

const formatDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const money = (value) =>
  `Rs ${Number(value || 0).toLocaleString("en-IN")}`;

function App() {
  const [coaches, setCoaches] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [payments, setPayments] = useState([]);

  const [selectedInstrument, setSelectedInstrument] =
    useState("All");

  const [search, setSearch] = useState("");
  const [selectedCoach, setSelectedCoach] = useState(null);

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authUser, setAuthUser] = useState(null);

  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "STUDENT",
  });

  const [bookingForm, setBookingForm] = useState({
    instrumentId: "",
    dayOfWeek: "1",
    startTime: "17:00",
    startDate: "",
    durationMins: "60",
  });

  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("musiccoach_token")
      : null;

  const authHeaders = () => {
    const headers = {
      "Content-Type": "application/json",
    };

    const savedToken =
      typeof window !== "undefined"
        ? window.localStorage.getItem("musiccoach_token")
        : null;

    if (savedToken) {
      headers.Authorization = `Bearer ${savedToken}`;
    }

    return headers;
  };

  const currentStudentId =
    authUser?.studentProfileId || STUDENT_ID;

  const openAuth = (mode) => {
    setAuthMode(mode);
    setAuthError("");
    setAuthOpen(true);
  };

  const handleAuthSubmit = async (event) => {
    event.preventDefault();

    setAuthLoading(true);
    setAuthError("");

    try {
      const endpoint =
        authMode === "signup" ? "signup" : "login";

      const payload =
        authMode === "signup"
          ? authForm
          : {
              email: authForm.email,
              password: authForm.password,
            };

      const response = await fetch(
        `${API}/auth/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Authentication failed."
        );
      }

      window.localStorage.setItem(
        "musiccoach_token",
        result.token
      );

      setAuthUser(result.data);
      await loadData();
      setAuthOpen(false);
      setAuthError("");

      setAuthForm({
        name: "",
        email: "",
        password: "",
        role: "STUDENT",
      });

      setNotice(
        authMode === "signup"
          ? "Account created successfully!"
          : "Welcome back!"
      );
    } catch (error) {
      console.error(error);

      setAuthError(
        error.message ||
          "Unable to authenticate."
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem(
      "musiccoach_token"
    );

    setAuthUser(null);
    setBookings([]);
    setLessons([]);
    setProgress([]);
    setReviews([]);
    setPayments([]);
    setNotice("You have been logged out.");
  };

  useEffect(() => {
    const savedToken =
      window.localStorage.getItem(
        "musiccoach_token"
      );

    if (!savedToken) return;

    fetch(`${API}/auth/me`, {
      headers: {
        Authorization: `Bearer ${savedToken}`,
      },
    })
      .then(async (response) => {
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error("Session expired.");
        }

        setAuthUser(result.data);
      })
      .catch(() => {
        window.localStorage.removeItem(
          "musiccoach_token"
        );

        setAuthUser(null);
      });
  }, []);

  const [reviewForm, setReviewForm] = useState({
    bookingId: "",
    rating: "5",
    comment: "",
  });

  /*
   * LOAD ALL DATA
   */
  const loadData = async () => {
    try {
      setLoading(true);

      const headers = authHeaders();

      const responses = await Promise.all([
        fetch(`${API}/coaches`, { headers }),
        fetch(`${API}/bookings`, { headers }),
        fetch(`${API}/lessons`, { headers }),
        fetch(`${API}/progress`, { headers }),
        fetch(`${API}/reviews`, { headers }),
        fetch(`${API}/payments`, { headers }),
      ]);

      const [
        coachesJson,
        bookingsJson,
        lessonsJson,
        progressJson,
        reviewsJson,
        paymentsJson,
      ] = await Promise.all(
        responses.map((response) => response.json())
      );

      const apiCoaches = safeArray(coachesJson.data);
      const apiBookings = safeArray(bookingsJson.data);

      /*
       * COACH FALLBACK
       *
       * If /api/coaches does not return a coach but that coach
       * exists inside a booking, recover that coach here.
       *
       * This makes Find a Coach more reliable in production.
       */
      const coachMap = new Map();

      apiCoaches.forEach((coach) => {
        if (coach?.id) {
          coachMap.set(coach.id, coach);
        }
      });

      apiBookings.forEach((booking) => {
        const bookingCoach = booking?.coach;

        if (!bookingCoach?.id) return;

        if (!coachMap.has(bookingCoach.id)) {
          coachMap.set(bookingCoach.id, {
            ...bookingCoach,

            instruments:
              bookingCoach.instruments?.length
                ? bookingCoach.instruments
                : booking.instrument
                  ? [
                      {
                        instrument: booking.instrument,
                      },
                    ]
                  : [],
          });
        } else {
          const existingCoach =
            coachMap.get(bookingCoach.id);

          if (
            (!existingCoach.instruments ||
              existingCoach.instruments.length === 0) &&
            booking.instrument
          ) {
            existingCoach.instruments = [
              {
                instrument: booking.instrument,
              },
            ];
          }
        }
      });

      const finalCoaches = Array.from(
        coachMap.values()
      );

      setCoaches(finalCoaches);
      setBookings(apiBookings);

      setLessons(
        safeArray(lessonsJson.data)
      );

      setProgress(
        safeArray(progressJson.data)
      );

      setReviews(
        safeArray(reviewsJson.data)
      );

      setPayments(
        safeArray(paymentsJson.data)
      );
    } catch (error) {
      console.error(error);

      setNotice(
        "Unable to load data. Please make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /*
   * FILTER COACHES
   */
  const filteredCoaches = useMemo(() => {
    const query = search.trim().toLowerCase();

    return coaches.filter((coach) => {
      const name =
        coach.user?.name?.toLowerCase() || "";

      const bio =
        coach.bio?.toLowerCase() || "";

      const instrumentMatch =
        selectedInstrument === "All" ||
        coach.instruments?.some(
          (item) =>
            item.instrument?.name ===
            selectedInstrument
        );

      const searchMatch =
        !query ||
        name.includes(query) ||
        bio.includes(query) ||
        coach.instruments?.some((item) =>
          item.instrument?.name
            ?.toLowerCase()
            .includes(query)
        );

      return (
        instrumentMatch &&
        searchMatch
      );
    });
  }, [
    coaches,
    selectedInstrument,
    search,
  ]);

  /*
   * COACH RATING
   */
  const getCoachRating = (coachId) => {
    const coachReviews = reviews.filter(
      (review) =>
        review.coachId === coachId
    );

    if (!coachReviews.length) {
      return "5.0";
    }

    const total = coachReviews.reduce(
      (sum, review) =>
        sum + Number(review.rating || 0),
      0
    );

    return (
      total / coachReviews.length
    ).toFixed(1);
  };

  /*
   * OPEN COACH
   */
  const openCoach = (coach) => {
    setSelectedCoach(coach);

    const firstInstrument =
      coach.instruments?.[0]?.instrument;

    setBookingForm((current) => ({
      ...current,
      instrumentId:
        firstInstrument?.id || "",
    }));

    setTimeout(() => {
      document
        .getElementById("booking")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  };

  /*
   * BOOKING
   */
  const handleBooking = async (event) => {
    event.preventDefault();

    if (!selectedCoach) {
      setNotice(
        "Please select a coach first."
      );
      return;
    }

    if (
      !bookingForm.instrumentId ||
      !bookingForm.startDate
    ) {
      setNotice(
        "Please select an instrument and start date."
      );
      return;
    }

    try {
      const response = await fetch(
        `${API}/bookings`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            studentId: currentStudentId,
            coachId: selectedCoach.id,
            instrumentId:
              bookingForm.instrumentId,
            dayOfWeek: Number(
              bookingForm.dayOfWeek
            ),
            startTime:
              bookingForm.startTime,
            durationMins: Number(
              bookingForm.durationMins
            ),
            startDate: bookingForm.startDate,
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Booking failed"
        );
      }

      setNotice(
        "Trial lesson booked successfully!"
      );

      await loadData();

      document
        .getElementById("bookings")
        ?.scrollIntoView({
          behavior: "smooth",
        });
    } catch (error) {
      console.error(error);

      setNotice(
        error.message ||
          "Unable to create booking."
      );
    }
  };

  /*
   * CANCEL BOOKING
   */
  const cancelBooking = async (
    bookingId
  ) => {
    const confirmed =
      window.confirm(
        "Are you sure you want to cancel this booking?"
      );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API}/bookings/${bookingId}/cancel`,
        {
          method: "PATCH",
          headers: authHeaders(),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Cancellation failed"
        );
      }

      setNotice(
        "Booking cancelled successfully."
      );

      await loadData();
    } catch (error) {
      console.error(error);

      setNotice(
        error.message ||
          "Unable to cancel booking."
      );
    }
  };

  /*
   * PAYMENT
   */
  const getPaymentForBooking = (
    bookingId
  ) => {
    return payments.find(
      (payment) =>
        payment.bookingId ===
        bookingId
    );
  };

  const payForBooking = async (
    booking
  ) => {
    if (
      booking.status ===
      "CANCELLED"
    ) {
      setNotice(
        "Cancelled bookings cannot be paid."
      );
      return;
    }

    const existingPayment =
      getPaymentForBooking(
        booking.id
      );

    try {
      let paymentId =
        existingPayment?.id;

      if (!paymentId) {
        const hourlyRate = Number(
          booking.coach?.hourlyRate ||
            500
        );

        const amount =
          hourlyRate *
          (Number(
            booking.durationMins || 60
          ) /
            60);

        const createResponse =
          await fetch(
            `${API}/payments`,
            {
              method: "POST",
              headers: authHeaders(),
              body: JSON.stringify({
                bookingId:
                  booking.id,
                amount,
                transactionId: `MC-DEMO-${Date.now()}`,
              }),
            }
          );

        const createResult =
          await createResponse.json();

        if (!createResponse.ok) {
          throw new Error(
            createResult.message ||
              "Payment creation failed"
          );
        }

        paymentId =
          createResult.data?.id;
      }

      if (!paymentId) {
        throw new Error(
          "Payment record was not created."
        );
      }

      const statusResponse =
        await fetch(
          `${API}/payments/${paymentId}/status`,
          {
            method: "PATCH",
            headers: authHeaders(),
            body: JSON.stringify({
              status: "PAID",
            }),
          }
        );

      const statusResult =
        await statusResponse.json();

      if (!statusResponse.ok) {
        throw new Error(
          statusResult.message ||
            "Payment failed"
        );
      }

      setNotice(
        "Payment successful! Demo transaction completed."
      );

      await loadData();
    } catch (error) {
      console.error(error);

      setNotice(
        error.message ||
          "Unable to process payment."
      );
    }
  };

  /*
   * REVIEW
   */
  const submitReview = async (
    event
  ) => {
    event.preventDefault();

    const selectedLesson =
      lessons.find(
        (lesson) =>
          lesson.bookingId ===
          reviewForm.bookingId
      );

    const booking =
      bookings.find(
        (item) =>
          item.id ===
          reviewForm.bookingId
      );

    if (
      !booking ||
      !selectedLesson
    ) {
      setNotice(
        "Please select a completed lesson."
      );
      return;
    }

    try {
      const response =
        await fetch(
          `${API}/reviews`,
          {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
              bookingId:
                booking.id,
              studentId:
                booking.studentId,
              coachId:
                booking.coachId,
              rating: Number(
                reviewForm.rating
              ),
              comment:
                reviewForm.comment,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Review submission failed"
        );
      }

      setReviewForm({
        bookingId: "",
        rating: "5",
        comment: "",
      });

      setNotice(
        "Thank you! Your review was submitted."
      );

      await loadData();
    } catch (error) {
      console.error(error);

      setNotice(
        error.message ||
          "Unable to submit review."
      );
    }
  };

  /*
   * DASHBOARD CALCULATIONS
   */
  const activeBookings =
    bookings.filter(
      (booking) =>
        booking.status !==
        "CANCELLED"
    );

  const completedLessons =
    lessons.filter(
      (lesson) =>
        lesson.status ===
        "COMPLETED"
    );

  const paidAmount =
    payments
      .filter(
        (payment) =>
          payment.status === "PAID"
      )
      .reduce(
        (sum, payment) =>
          sum +
          Number(
            payment.amount || 0
          ),
        0
      );

  const averageRating =
    reviews.length
      ? (
          reviews.reduce(
            (sum, review) =>
              sum +
              Number(
                review.rating || 0
              ),
            0
          ) /
          reviews.length
        ).toFixed(1)
      : "5.0";

  return (
    <div className="app">

      {notice && (
        <div className="notice">
          <span>{notice}</span>

          <button
            onClick={() =>
              setNotice("")
            }
          >
            
          </button>
        </div>
      )}

      {/* NAVBAR */}

      <header className="navbar">

        <a
          href="#home"
          className="brand"
        >
          <span className="brand-icon">
            
          </span>

          <span>
            Music<span>Coach</span>
          </span>
        </a>

        <nav className="nav-links">
          <a href="#home">
            Home
          </a>

          <a href="#coaches">
            Find a Coach
          </a>

          <a href="#how-it-works">
            How It Works
          </a>

          <a href="#dashboard">
            Dashboard
          </a>
        </nav>

        <div className="nav-actions">

          {authUser ? (
            <>
              <span className="nav-user">
                Hi, {authUser.name}
              </span>

              <button
                className="ghost-button"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                className="ghost-button"
                onClick={() => openAuth("login")}
              >
                Login
              </button>

              <button
                className="dark-button small"
                onClick={() => openAuth("signup")}
              >
                Sign Up
              </button>
            </>
          )}

        </div>

      </header>

      <main>

        {/* HERO */}

        <section
          className="hero"
          id="home"
        >

          <div className="hero-content">

            <div className="eyebrow">
               TRUSTED MUSIC LEARNING PLATFORM
            </div>

            <h1>
              Learn Music.
              <br />
              <span>
                Grow Your Talent.
              </span>
            </h1>

            <p>
              Connect with trusted piano,
              violin and vocal coaches for
              structured, personalized music
              lessons from the comfort of home.
            </p>

            <div className="hero-actions">

              <a
                href="#coaches"
                className="dark-button"
              >
                Find Your Coach 
              </a>

              <a
                href="#how-it-works"
                className="outline-button"
              >
                How It Works
              </a>

            </div>

            <div className="trust-row">
              <span>
                 Verified Coaches
              </span>

              <span>
                 Flexible Scheduling
              </span>

              <span>
                 Progress Tracking
              </span>
            </div>

          </div>

          <div className="hero-visual">

            <div className="music-orb">
              <div className="music-note">
                
              </div>
            </div>

            <div className="floating-card rating-card">
              <strong>
                 5.0
              </strong>

              <span>
                Rated Coaches
              </span>
            </div>

            <div className="floating-card lesson-card">
              <strong>
                 Weekly
              </strong>

              <span>
                Personal Lessons
              </span>
            </div>

          </div>

        </section>

        {/* STATS */}

        <section className="stats-strip">

          <div>
            <strong>
              500+
            </strong>

            <span>
              Music Coaches
            </span>
          </div>

          <div>
            <strong>
              3
            </strong>

            <span>
              Instruments
            </span>
          </div>

          <div>
            <strong>
              1:1
            </strong>

            <span>
              Personal Learning
            </span>
          </div>

          <div>
            <strong>
              100%
            </strong>

            <span>
              Progress Focused
            </span>
          </div>

        </section>

        {/* INSTRUMENTS */}

        <section className="section instrument-section">

          <div className="section-heading center">

            <span className="section-label">
              LEARN YOUR WAY
            </span>

            <h2>
              Choose your instrument
            </h2>

            <p>
              Find the right teacher and start
              learning from the comfort of home.
            </p>

          </div>

          <div className="instrument-grid">

            {instruments.map(
              (instrument) => (
                <button
                  className="instrument-card"
                  key={instrument.name}
                  onClick={() => {
                    setSelectedInstrument(
                      instrument.name
                    );

                    document
                      .getElementById(
                        "coaches"
                      )
                      ?.scrollIntoView({
                        behavior:
                          "smooth",
                      });
                  }}
                >

                  <span className="instrument-icon">
                    {instrument.icon}
                  </span>

                  <strong>
                    {instrument.name}
                  </strong>

                  <span>
                    {instrument.text}
                  </span>

                  <small>
                    Explore coaches 
                  </small>

                </button>
              )
            )}

          </div>

        </section>

        {/* WHY */}

        <section
          className="section why-section"
          id="how-it-works"
        >

          <div className="section-heading center">

            <span className="section-label">
              WHY MUSICCOACH
            </span>

            <h2>
              Everything you need to keep improving
            </h2>

          </div>

          <div className="feature-grid">

            <Feature
              icon=""
              title="Trusted Coaches"
            >
              Discover experienced and verified
              music coaches.
            </Feature>

            <Feature
              icon=""
              title="Flexible Lessons"
            >
              Choose lesson times that work
              with your schedule.
            </Feature>

            <Feature
              icon=""
              title="Track Progress"
            >
              See notes, strengths, improvements
              and homework.
            </Feature>

            <Feature
              icon=""
              title="Real Reviews"
            >
              Learn from the experiences of
              other students.
            </Feature>

          </div>

        </section>

        {/* COACHES */}

        <section
          className="section coach-section"
          id="coaches"
        >

          <div className="section-heading">

            <div>

              <span className="section-label">
                FIND YOUR COACH
              </span>

              <h2>
                Learn from the right teacher
              </h2>

              <p>
                Search trusted coaches by
                instrument or name.
              </p>

            </div>

            <div className="coach-count">
              {filteredCoaches.length} coach
              {filteredCoaches.length !== 1
                ? "es"
                : ""}
            </div>

          </div>

          <div className="coach-tools">

            <input
              className="search-input"
              placeholder=" Search coach or instrument..."
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
            />

            <div className="filter-buttons">

              {[
                "All",
                "Piano",
                "Violin",
                "Vocal",
              ].map(
                (instrument) => (
                  <button
                    key={instrument}
                    className={
                      selectedInstrument ===
                      instrument
                        ? "filter-button active"
                        : "filter-button"
                    }
                    onClick={() =>
                      setSelectedInstrument(
                        instrument
                      )
                    }
                  >
                    {instrument}
                  </button>
                )
              )}

            </div>

          </div>

          {loading ? (

            <div className="empty-state">

              <div className="loader" />

              <p>
                Finding your coaches...
              </p>

            </div>

          ) : filteredCoaches.length ===
            0 ? (

            <div className="empty-state">

              <div className="empty-icon">
                
              </div>

              <h3>
                No coaches found
              </h3>

              <p>
                Try another instrument or
                search term.
              </p>

            </div>

          ) : (

            <div className="coach-grid">

              {filteredCoaches.map(
                (coach) => (
                  <CoachCard
                    key={coach.id}
                    coach={coach}
                    rating={getCoachRating(
                      coach.id
                    )}
                    onSelect={() =>
                      openCoach(coach)
                    }
                  />
                )
              )}

            </div>

          )}

        </section>

        {/* BOOKING */}

        {selectedCoach && (

          <section
            className="section booking-section"
            id="booking"
          >

            <div className="booking-layout">

              <div className="selected-coach">

                <span className="section-label">
                  YOUR SELECTED COACH
                </span>

                <div className="profile-avatar large">
                  {selectedCoach.user?.name?.charAt(
                    0
                  ) || "C"}
                </div>

                <h2>
                  {selectedCoach.user?.name ||
                    "Music Coach"}
                </h2>

                <div className="rating-line">
                  {" "}
                  {getCoachRating(
                    selectedCoach.id
                  )}

                  <span>
                    (
                    {
                      reviews.filter(
                        (review) =>
                          review.coachId ===
                          selectedCoach.id
                      ).length
                    }{" "}
                    reviews)
                  </span>
                </div>

                <p>
                  {selectedCoach.bio ||
                    "Experienced music coach ready to help you reach your goals."}
                </p>

                <div className="profile-pills">

                  {selectedCoach.isVerified && (
                    <span>
                       Verified
                    </span>
                  )}

                  {selectedCoach.backgroundCheck && (
                    <span>
                       {"\u{1F6E1}"} Background Checked
                    </span>
                  )}

                </div>

                <div className="profile-details">

                  <div>
                    <strong>
                      {selectedCoach.experienceYears ||
                        0}
                      +
                    </strong>

                    <span>
                      Years Experience
                    </span>
                  </div>

                  <div>
                    <strong>
                      {money(
                        selectedCoach.hourlyRate ||
                          500
                      )}
                    </strong>

                    <span>
                      Per Hour
                    </span>
                  </div>

                </div>

              </div>

              <form
                className="booking-form"
                onSubmit={handleBooking}
              >

                <div className="form-header">

                  <span className="section-label">
                    BOOK A LESSON
                  </span>

                  <h2>
                    Start your music journey
                  </h2>

                  <p>
                    Book a trial lesson with your
                    selected coach.
                  </p>

                </div>

                <label>
                  Instrument

                  <select
                    value={
                      bookingForm.instrumentId
                    }
                    onChange={(event) =>
                      setBookingForm({
                        ...bookingForm,
                        instrumentId:
                          event.target.value,
                      })
                    }
                  >

                    <option value="">
                      Select instrument
                    </option>

                    {selectedCoach.instruments?.map(
                      (item) => (
                        <option
                          value={
                            item.instrument?.id
                          }
                          key={
                            item.instrument?.id
                          }
                        >
                          {
                            item.instrument
                              ?.name
                          }
                        </option>
                      )
                    )}

                  </select>

                </label>

                <div className="form-row">

                  <label>
                    Day

                    <select
                      value={
                        bookingForm.dayOfWeek
                      }
                      onChange={(event) =>
                        setBookingForm({
                          ...bookingForm,
                          dayOfWeek:
                            event.target.value,
                        })
                      }
                    >

                      <option value="1">
                        Monday
                      </option>

                      <option value="2">
                        Tuesday
                      </option>

                      <option value="3">
                        Wednesday
                      </option>

                      <option value="4">
                        Thursday
                      </option>

                      <option value="5">
                        Friday
                      </option>

                      <option value="6">
                        Saturday
                      </option>

                      <option value="0">
                        Sunday
                      </option>

                    </select>
                  </label>

                  <label>
                    Start Time

                    <input
                      type="time"
                      value={
                        bookingForm.startTime
                      }
                      onChange={(event) =>
                        setBookingForm({
                          ...bookingForm,
                          startTime:
                            event.target.value,
                        })
                      }
                    />
                  </label>

                </div>

                <div className="form-row">

                  <label>
                    First Lesson Date

                    <input
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={
                        bookingForm.startDate
                      }
                      onChange={(event) =>
                        setBookingForm({
                          ...bookingForm,
                          startDate:
                            event.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Duration

                    <select
                      value={
                        bookingForm.durationMins
                      }
                      onChange={(event) =>
                        setBookingForm({
                          ...bookingForm,
                          durationMins:
                            event.target.value,
                        })
                      }
                    >

                      <option value="30">
                        30 minutes
                      </option>

                      <option value="45">
                        45 minutes
                      </option>

                      <option value="60">
                        60 minutes
                      </option>

                      <option value="90">
                        90 minutes
                      </option>

                    </select>
                  </label>

                </div>

                <div className="booking-summary">

                  <span>
                    Estimated lesson price
                  </span>

                  <strong>
                    {money(
                      (selectedCoach.hourlyRate ||
                        500) *
                        (Number(
                          bookingForm.durationMins
                        ) /
                          60)
                    )}
                  </strong>

                </div>

                <button
                  className="dark-button full"
                  type="submit"
                >
                  {"\u{1F3B5}"} Book Trial Lesson
                </button>

              </form>

            </div>

          </section>

        )}

        {/* DASHBOARD */}

        <section
          className="section dashboard-section"
          id="dashboard"
        >

          <div className="section-heading">

            <div>

              <span className="section-label">
                STUDENT DASHBOARD
              </span>

              <h2>
                Your learning journey
              </h2>

              <p>
                Everything you need to stay
                on track.
              </p>

            </div>

          </div>

          <div className="dashboard-stats">

            <StatCard
              icon=""
              value={activeBookings.length}
              label="Total Bookings"
            />

            <StatCard
              icon=""
              value={
                completedLessons.length
              }
              label="Completed Lessons"
            />

            <StatCard
              icon=""
              value={averageRating}
              label="Average Rating"
            />

            <StatCard
              icon=""
              value={money(paidAmount)}
              label="Amount Paid"
            />

          </div>

        </section>

        {/* BOOKINGS */}

        <section
          className="section data-section"
          id="bookings"
        >

          <SectionTitle
            label="MY BOOKINGS"
            title="Your lessons"
            text="Manage your upcoming and previous bookings."
          />

          {bookings.length === 0 ? (

            <Empty
              text="No bookings yet. Find a coach and book your first lesson."
            />

          ) : (

            <div className="data-grid">

              {bookings.map(
                (booking) => {
                  const payment =
                    getPaymentForBooking(
                      booking.id
                    );

                  const coach =
                    booking.coach;

                  const instrument =
                    booking.instrument;

                  return (
                    <div
                      className="data-card"
                      key={booking.id}
                    >

                      <div className="data-card-top">

                        <div className="mini-avatar">
                          {coach?.user?.name?.charAt(
                            0
                          ) || "C"}
                        </div>

                        <div>

                          <h3>
                            {coach?.user?.name ||
                              "Coach"}
                          </h3>

                          <p>
                            {instrument?.name ||
                              "Music"}{" "}
                            Lesson
                          </p>

                        </div>

                        <StatusBadge
                          status={
                            booking.status
                          }
                        />

                      </div>

                      <div className="info-list">

                        <div>
                          <span>
                             Date
                          </span>

                          <strong>
                            {formatDate(
                              booking.startDate
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>
                             Time
                          </span>

                          <strong>
                            {
                              booking.startTime
                            }
                          </strong>
                        </div>

                        <div>
                          <span>
                             Duration
                          </span>

                          <strong>
                            {
                              booking.durationMins
                            }{" "}
                            mins
                          </strong>
                        </div>

                      </div>

                      <div className="card-actions">

                        {booking.status !==
                          "CANCELLED" &&
                          booking.status !==
                            "COMPLETED" && (

                            <button
                              className="danger-button"
                              onClick={() =>
                                cancelBooking(
                                  booking.id
                                )
                              }
                            >
                              Cancel
                            </button>

                          )}

                        {booking.status ===
                        "CANCELLED" ? (

                          <span className="cancelled-badge">
                            Cancelled
                          </span>

                        ) : payment?.status ===
                          "PAID" ? (

                          <span className="paid-badge">
                             Paid
                          </span>

                        ) : (

                          <button
                            className="dark-button"
                            onClick={() =>
                              payForBooking(
                                booking
                              )
                            }
                          >
                             Pay Now
                          </button>

                        )}

                      </div>

                    </div>
                  );
                }
              )}

            </div>

          )}

        </section>

        {/* LESSONS */}

        <section
          className="section data-section"
          id="lessons"
        >

          <SectionTitle
            label="MY LESSONS"
            title="Lesson history"
            text="Review your completed and scheduled lessons."
          />

          {lessons.length === 0 ? (

            <Empty
              text="Your lessons will appear here after you book a coach."
            />

          ) : (

            <div className="lesson-list">

              {lessons.map(
                (lesson) => (

                  <div
                    className="lesson-row"
                    key={lesson.id}
                  >

                    <div className="lesson-date">

                      <strong>
                        {new Date(
                          lesson.date
                        ).getDate()}
                      </strong>

                      <span>
                        {new Date(
                          lesson.date
                        ).toLocaleDateString(
                          "en-IN",
                          {
                            month: "short",
                          }
                        )}
                      </span>

                    </div>

                    <div className="lesson-info">

                      <h3>
                        {lesson.booking
                          ?.instrument?.name ||
                          "Music"}{" "}
                        Lesson
                      </h3>

                      <p>
                        with{" "}
                        {lesson.booking
                          ?.coach?.user?.name ||
                          "your coach"}
                      </p>

                    </div>

                    <StatusBadge
                      status={
                        lesson.status
                      }
                    />

                    <div className="lesson-note">
                      {lesson.notes ||
                        "No lesson notes added yet."}
                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </section>

        {/* PROGRESS */}

        <section
          className="section progress-section"
          id="progress"
        >

          <SectionTitle
            label="PROGRESS TRACKING"
            title="Keep getting better"
            text="Review strengths, improvements and practice homework."
          />

          {progress.length === 0 ? (

            <Empty
              text="Progress notes will appear after your coach adds them."
            />

          ) : (

            <div className="progress-grid">

              {progress.map(
                (item) => (

                  <div
                    className="progress-card"
                    key={item.id}
                  >

                    <div className="progress-card-head">

                      <span>
                         Progress Note
                      </span>

                      <small>
                        {formatDate(
                          item.createdAt
                        )}
                      </small>

                    </div>

                    <h3>
                      {item.lesson
                        ?.booking
                        ?.instrument
                        ?.name ||
                        "Music"}{" "}
                      Lesson
                    </h3>

                    <ProgressBlock
                      title="Lesson Summary"
                      text={item.summary}
                    />

                    <ProgressBlock
                      title="Strengths"
                      text={item.strengths}
                      positive
                    />

                    <ProgressBlock
                      title="Needs Improvement"
                      text={
                        item.improvements
                      }
                    />

                    <ProgressBlock
                      title="Homework"
                      text={item.homework}
                      homework
                    />

                  </div>

                )
              )}

            </div>

          )}

        </section>

        {/* REVIEWS */}

        <section
          className="section review-section"
          id="reviews"
        >

          <SectionTitle
            label="REVIEWS & RATINGS"
            title="Share your experience"
            text="Your feedback helps students discover great coaches."
          />

          <div className="review-layout">

            <form
              className="review-form"
              onSubmit={submitReview}
            >

              <h3>
                Leave a review
              </h3>

              <label>

                Completed lesson

                <select
                  value={
                    reviewForm.bookingId
                  }
                  onChange={(event) =>
                    setReviewForm({
                      ...reviewForm,
                      bookingId:
                        event.target.value,
                    })
                  }
                >

                  <option value="">
                    Select a lesson
                  </option>

                  {completedLessons.map(
                    (lesson) => (

                      <option
                        value={
                          lesson.bookingId
                        }
                        key={lesson.id}
                      >
                        {lesson.booking
                          ?.coach?.user
                          ?.name ||
                          "Coach"}{" "}
                        {" "}
                        {lesson.booking
                          ?.instrument
                          ?.name ||
                          "Music"}
                      </option>

                    )
                  )}

                </select>

              </label>

              <label>

                Rating

                <select
                  value={
                    reviewForm.rating
                  }
                  onChange={(event) =>
                    setReviewForm({
                      ...reviewForm,
                      rating:
                        event.target.value,
                    })
                  }
                >

                  <option value="5">
                      Excellent
                  </option>

                  <option value="4">
                      Very Good
                  </option>

                  <option value="3">
                      Good
                  </option>

                  <option value="2">
                      Needs Improvement
                  </option>

                  <option value="1">
                      Poor
                  </option>

                </select>

              </label>

              <label>

                Comment

                <textarea
                  rows="4"
                  placeholder="Tell us about your lesson..."
                  value={
                    reviewForm.comment
                  }
                  onChange={(event) =>
                    setReviewForm({
                      ...reviewForm,
                      comment:
                        event.target.value,
                    })
                  }
                />

              </label>

              <button
                className="dark-button full"
                type="submit"
              >
                Submit Review
              </button>

            </form>

            <div className="reviews-list">

              {reviews.length === 0 ? (

                <Empty text="No reviews yet." />

              ) : (

                reviews.map(
                  (review) => (

                    <div
                      className="review-card"
                      key={review.id}
                    >

                      <div className="review-top">

                        <div className="mini-avatar">
                          {review.student
                            ?.user?.name?.charAt(
                              0
                            ) || "S"}
                        </div>

                        <div>

                          <h3>
                            {review.student
                              ?.user?.name ||
                              "Student"}
                          </h3>

                          <p>
                            {review.booking
                              ?.instrument
                              ?.name ||
                              "Music"}{" "}
                            {" "}
                            {review.coach
                              ?.user?.name ||
                              "Coach"}
                          </p>

                        </div>

                        <strong>
                          {" "}
                          {review.rating}/5
                        </strong>

                      </div>

                      <p className="review-comment">
                        
                        {review.comment ||
                          "Great learning experience!"}
                        
                      </p>

                      <small>
                        {formatDate(
                          review.createdAt
                        )}
                      </small>

                    </div>

                  )
                )

              )}

            </div>

          </div>

        </section>

        {/* CTA */}

        <section className="cta-section">

          <div>

            <span className="section-label">
              READY TO START?
            </span>

            <h2>
              Your musical journey starts today.
            </h2>

            <p>
              Find a trusted coach, book a
              trial and take the next step.
            </p>

          </div>

          <a
            href="#coaches"
            className="light-button"
          >
            Find My Coach {"\u{2192}"}
          </a>

        </section>

      </main>

      {/* FOOTER */}

      <footer className="footer">

        <div className="footer-main">

          <div>

            <a
              href="#home"
              className="brand footer-brand"
            >

              <span className="brand-icon">
                
              </span>

              <span>
                Music<span>Coach</span>
              </span>

            </a>

            <p>
              Helping students discover their
              musical potential with trusted
              coaches.
            </p>

          </div>

          <div>

            <h4>
              Explore
            </h4>

            <a href="#coaches">
              Find a Coach
            </a>

            <a href="#how-it-works">
              How It Works
            </a>

          </div>

          <div>

            <h4>
              Student
            </h4>

            <a href="#bookings">
              My Bookings
            </a>

            <a href="#progress">
              My Progress
            </a>

            <a href="#bookings">
              Payments
            </a>

          </div>

        </div>

        <div className="footer-bottom">
           {"\u{00A9}"} 2026 MusicCoach. All rights reserved.
        </div>

      </footer>

      {/* AUTH MODAL */}

      {authOpen && (

        <div
          className="modal-backdrop"
          onClick={() =>
            setAuthOpen(false)
          }
        >

          <div
            className="auth-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <button
              className="modal-close"
              onClick={() =>
                setAuthOpen(false)
              }
            >
              
            </button>

            <div className="auth-icon">
              ??
            </div>

            <h2>
              {authMode === "signup"
                ? "Create your MusicCoach account"
                : "Welcome back"}
            </h2>

            <p>
              {authMode === "signup"
                ? "Start learning with a trusted music coach."
                : "Login to manage your lessons and progress."}
            </p>

            {authError && (
              <div
                className="demo-note"
                style={{
                  color: "#b91c1c",
                  marginBottom: "14px",
                }}
              >
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit}>
              {authMode === "signup" && (
                <input
                  type="text"
                  placeholder="Full name"
                  value={authForm.name}
                  onChange={(event) =>
                    setAuthForm({
                      ...authForm,
                      name: event.target.value,
                    })
                  }
                  required
                />
              )}

              <input
                type="email"
                placeholder="Email address"
                value={authForm.email}
                onChange={(event) =>
                  setAuthForm({
                    ...authForm,
                    email: event.target.value,
                  })
                }
                required
              />

              <input
                type="password"
                placeholder="Password"
                minLength={6}
                value={authForm.password}
                onChange={(event) =>
                  setAuthForm({
                    ...authForm,
                    password: event.target.value,
                  })
                }
                required
              />

              {authMode === "signup" && (
                <select
                  value={authForm.role}
                  onChange={(event) =>
                    setAuthForm({
                      ...authForm,
                      role: event.target.value,
                    })
                  }
                >
                  <option value="STUDENT">
                    Student
                  </option>

                  <option value="PARENT">
                    Parent
                  </option>
                </select>
              )}

              <button
                type="submit"
                className="dark-button full"
                disabled={authLoading}
              >
                {authLoading
                  ? "Please wait..."
                  : authMode === "signup"
                    ? "Create Account"
                    : "Login"}
              </button>
            </form>

            <button
              type="button"
              className="ghost-button"
              style={{
                width: "100%",
                marginTop: "12px",
              }}
              onClick={() => {
                setAuthMode(
                  authMode === "signup"
                    ? "login"
                    : "signup"
                );

                setAuthError("");
              }}
            >
              {authMode === "signup"
                ? "Already have an account? Login"
                : "New to MusicCoach? Sign Up"}
            </button>

            <small className="demo-note">
              Your account session is saved in this browser.
            </small>

          </div>

        </div>

      )}

    </div>
  );
}

/*
 * FEATURE
 */
function Feature({
  icon,
  title,
  children,
}) {
  return (
    <div className="feature-card">

      <span className="feature-icon">
        {icon}
      </span>

      <h3>
        {title}
      </h3>

      <p>
        {children}
      </p>

    </div>
  );
}

/*
 * COACH CARD
 */
function CoachCard({
  coach,
  rating,
  onSelect,
}) {
  const coachInstruments =
    coach.instruments
      ?.map(
        (item) =>
          item.instrument?.name
      )
      .filter(Boolean) || [];

  return (
    <article className="coach-card">

      <div className="coach-card-top">

        <div className="profile-avatar">
          {coach.user?.name?.charAt(
            0
          ) || "C"}
        </div>

        <div className="coach-rating">
           {rating}
        </div>

      </div>

      <h3>
        {coach.user?.name ||
          "Music Coach"}
      </h3>

      <div className="coach-tags">

        {coach.isVerified && (
          <span>
             Verified
          </span>
        )}

        {coach.backgroundCheck && (
          <span>
             Checked
          </span>
        )}

      </div>

      <p>
        {coach.bio ||
          "Experienced music coach offering personalized one-to-one lessons."}
      </p>

      <div className="instrument-tags">

        {coachInstruments.map(
          (name) => (
            <span key={name}>
              {name}
            </span>
          )
        )}

      </div>

      <div className="coach-meta">

        <div>

          <strong>
            {coach.experienceYears ||
              0}
            +
          </strong>

          <span>
            Years
          </span>

        </div>

        <div>

          <strong>
            {money(
              coach.hourlyRate ||
                500
            )}
          </strong>

          <span>
            Per hour
          </span>

        </div>

      </div>

      <button
        className="dark-button full"
        onClick={onSelect}
      >
        View Profile & Book {"\u{2192}"}
      </button>

    </article>
  );
}

/*
 * SECTION TITLE
 */
function SectionTitle({
  label,
  title,
  text,
}) {
  return (
    <div className="section-heading">

      <div>

        <span className="section-label">
          {label}
        </span>

        <h2>
          {title}
        </h2>

        {text && (
          <p>
            {text}
          </p>
        )}

      </div>

    </div>
  );
}

/*
 * STAT CARD
 */
function StatCard({
  icon,
  value,
  label,
}) {
  return (
    <div className="stat-card">

      <span>
        {icon}
      </span>

      <strong>
        {value}
      </strong>

      <small>
        {label}
      </small>

    </div>
  );
}

/*
 * STATUS BADGE
 */
function StatusBadge({
  status,
}) {
  const label = String(
    status || "UNKNOWN"
  )
    .toLowerCase()
    .replaceAll("_", " ");

  return (
    <span
      className={`status ${label}`}
    >
      {label}
    </span>
  );
}

/*
 * PROGRESS BLOCK
 */
function ProgressBlock({
  title,
  text,
  positive,
  homework,
}) {
  return (
    <div
      className={`progress-block ${
        positive ? "positive" : ""
      } ${
        homework ? "homework" : ""
      }`}
    >

      <strong>
        {title}
      </strong>

      <p>
        {text ||
          "No information added yet."}
      </p>

    </div>
  );
}

/*
 * EMPTY STATE
 */
function Empty({
  text,
}) {
  return (
    <div className="empty-state compact">

      <div className="empty-icon">
        
      </div>

      <p>
        {text}
      </p>

    </div>
  );
}

export default App;

