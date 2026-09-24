import { Router } from "express";
import { register, login, logout, me } from "../controllers/authController";
import { authenticate } from "../middlewares/authMiddleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
// Deliberately unauthenticated: logging out must work even with an expired
// or invalid token, and it only clears the caller's own cookie.
router.post("/logout", logout);
router.get("/me", authenticate, me);

export default router;