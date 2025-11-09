import express from "express";
import passport from "passport";

const router = express.Router();

const setNoCache = (req, res, next) => {
  res.set("Cache-Control", "no-cache, private, no-store, must-revalidate");
  next();
};

router.get("/login/success", setNoCache, (req, res) => {
  if (req.user) {
    res.status(200).json({
      success: true,
      user: { id: req.user.id },
    });
  } else {
    res.status(401).json({
      success: false,
      user: null,
    });
  }
});

router.get("/login/failed", (req, res) => {
  res.status(401).json({
    success: false,
  });
});

router.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }

    req.session.destroy((err) => {
      if (err) {
        console.error("Session destruction error:", err);
      }

      res.clearCookie("connect.sid");
      res.set("Cache-Control", "no-cache, private, no-store, must-revalidate");
      res.redirect("http://localhost:5173/login");
    });
  });
});

router.get(
  "/github",
  passport.authenticate("github", { scope: ["read:user", "user:email"] })
);

router.get(
  "/github/callback",
  passport.authenticate("github", {
    successRedirect: "http://localhost:5173/",
    failureRedirect: "http://localhost:5173/login?success=failed",
  })
);

export default router;
