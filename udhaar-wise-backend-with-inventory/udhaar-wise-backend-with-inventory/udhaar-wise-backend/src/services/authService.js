import { supabase, supabaseAdmin } from "../config/supabase.js";

export async function signup(userData) {
  const {
    email,
    password,
  } = userData;

  const businessName = userData.business_name || userData.business || "";
  const phoneNumber = userData.phone_number || userData.phone || "";

  // Create user in Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) throw error;
  if (!data.user) {
    throw new Error("User was not created.");
  }

  const user = data.user;

  // Use the connection with the custom admin client to insert the record in public.users, bypassing RLS
  const clientToUse = supabaseAdmin || supabase;

  // Store additional profile data
  const { error: profileError } = await clientToUse
    .from("users")
    .insert([
      {
        id: user.id,
        email,
        business_name: businessName,
        phone_number: phoneNumber,
      },
    ]);

  if (profileError) throw profileError;

  return data;
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();

  if (error) throw error;

  return {
    message: "Logged out successfully",
  };
}