import * as authService from "../services/authService.js";

export async function signup(req, res) {
  try {
    const data = await authService.signup(req.body);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data,
    });
  } catch (error) {
    console.error("Signup Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    const data = await authService.login(email, password);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data,
    });
  } catch (error) {
    console.error("Login Error:", error);

    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
}

export async function logout(req, res) {
  try {
    const data = await authService.logout();

    return res.status(200).json({
      success: true,
      message: data.message,
    });
  } catch (error) {
    console.error("Logout Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}