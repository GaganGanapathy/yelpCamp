if (process.env.NODE_ENV !== "production") {
  require("dotenv").config()
}

const express = require("express")
const path = require("path")
const mongoose = require("mongoose")
const session = require("express-session")
const ejsMate = require("ejs-mate")
const flash = require("connect-flash")
const ExpressError = require("./utils/ExpressError")
const methodOverride = require("method-override")
const passport = require("passport")
const LocalStrategy = require("passport-local")
const User = require("./models/user")
const mongoSanitize = require("express-mongo-sanitize")
const helmet = require("helmet")
const MongoStore = require("connect-mongo")

const userRoutes = require("./routes/users")
const campgroundRoutes = require("./routes/campgrounds")
const reviewRoutes = require("./routes/reviews")

const dbUrl = process.env.DB_URL
mongoose.connect(dbUrl, {
  // allows users to fall back to old parser if they find bug in the new parser
  useNewUrlParser: true,
  // removes several support connection options that are no longer needed with the new topology
  useUnifiedTopology: true,
})
//   .then(() => console.log("Database connected"))
//   .catch((err) => {
//     console.log("connection error")
//     console.log(err)
//   })

const db = mongoose.connection
db.on("error", console.error.bind(console, "connection error:"))
db.once("open", () => {
  console.log("Database connected")
})

// execute express
const app = express()

app.use(mongoSanitize())

// for boilerplate
app.engine("ejs", ejsMate)

// for templating engine, to use ejs and to embed js
app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))

// recognize the incoming request objects as strings or arrays
app.use(express.urlencoded({ extended: true }))
// used to override method like PUT/DELETE where it doesn't support it
app.use(methodOverride("_method"))
// to serve static file like js or css
app.use(express.static(path.join(__dirname, "public")))

const store = MongoStore.create({
  mongoUrl: dbUrl,
  touchAfter: 24 * 60 * 60,
  crypto: {
    secret: "thisshouldbeabettersecret",
  },
})

store.on("error", function (e) {
  console.log("SESSION STORE ERROR", e)
})

const sessionConfig = {
  store,
  name: "session",
  secret: "thisshouldbeabettersecret",
  resave: false,
  saveUninitialized: true,
  cookie: {
    // doesn't reveal the cookie to the third party even during cross-site scripting (basically for security reasons)
    httpOnly: true,
    // cookies can only be configured through https
    // secure: true,
    // sets the expiration date of session cookie
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
    // how long a session is considered valid and active
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}
// instantiate the session
app.use(session(sessionConfig))
// simplify the process of configuring http headers to improve the nodejs web application
app.use(helmet({ contentSecurityPolicy: false }))

// initialize passport
app.use(passport.initialize())
// required for persistent login sessions
app.use(passport.session())
// to authenticate the model in LocalStrategy
passport.use(new LocalStrategy(User.authenticate()))

// to maintain login session , passport serialize and deserialize to and from sessions
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

app.use(flash())
// setting up the middleware so that we can have access on every request
app.use((req, res, next) => {
  res.locals.currentUser = req.user
  res.locals.success = req.flash("success")
  res.locals.error = req.flash("error")
  next()
})

app.use("/", userRoutes)
app.use("/campgrounds", campgroundRoutes)
app.use("/campgrounds/:id/reviews", reviewRoutes)

app.get("/", (req, res) => {
  res.render("home")
})

app.all("*", (err, req, res, next) => {
  next(new ExpressError("SOMETHING WENT WRONG!!!", 404))
})

app.use((err, req, res, next) => {
  const { statusCode = 500 } = err
  if (!err.message) err.message = "Something Went Wrong"
  res.status(statusCode).render("error", { err })
})

app.listen(3000, () => {
  console.log("lisening on port 3000")
})
