import express from "express";
import { requireUser } from "../middlewares/auth.js";
import {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  generatePromoController,
} from "../controllers/customersController.js";

const router = express.Router();

router.use(requireUser);

router.get("/", listCustomers);
router.get("/:id", getCustomerById);
router.post("/", createCustomer);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);
router.post("/:id/generate-promo", generatePromoController);

export default router;

