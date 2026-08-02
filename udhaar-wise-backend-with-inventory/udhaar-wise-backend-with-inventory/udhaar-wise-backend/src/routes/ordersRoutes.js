import express from "express";
import { requireUser } from "../middlewares/auth.js";
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  sendReminder,
  acceptOrder,
  rejectOrder,
  completeOrder,
} from "../controllers/ordersController.js";

const router = express.Router();

// resolveBusinessContext (orders-module) is replaced by requireUser: in
// this schema shopkeeper_id === req.user.id, so no separate tenant
// resolution step is needed.
router.use(requireUser);

router.get("/", getOrders);
router.get("/:id", getOrderById);
router.post("/", createOrder);
router.put("/:id", updateOrder);
router.delete("/:id", deleteOrder);
router.post("/:id/reminder", sendReminder);
router.post("/:id/accept", acceptOrder);
router.post("/:id/reject", rejectOrder);
router.post("/:id/complete", completeOrder);

export default router;
