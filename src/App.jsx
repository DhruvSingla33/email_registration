import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = "http://localhost:5000";
const DEFAULT_COOLDOWN = 10;

const App = () => {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("error");
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timerSec, setTimerSec] = useState(0);
  const timerRef = useRef(null);
  const inputsRef = useRef([]);

  useEffect(() => {
    if (timerSec <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        setTimerSec((s) => {
          if (s <= 1) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerSec]);

  const resendOtp = async () => {
    if (timerSec > 0) return;
    await sendOtp();
  };

  const validateEmail = (address) => /\S+@\S+\.\S+/.test(address);

  const checkUser = async (email) => {
    try {
      const res = await fetch(
        `${API}/api/check-user?email=${encodeURIComponent(email)}`
      );
      return await res.json();
    } catch (err) {
      console.error("checkUser error:", err);
      return { success: false };
    }
  };

  const sendOtp = async () => {
    setMsg("");
    if (!email || !validateEmail(email)) {
      setMsgType("error");
      setMsg("Please enter a valid email.");
      return;
    }
    setLoading(true);

    const check = await checkUser(email);
    if (check.success && check.exists && check.verified) {
      setUserData(check.user);
      setMsgType("success");
      setMsg("This email is already verified and registered ✅");
      setStep("done");
      setLoading(false);
      return;
    }

    fetch(`${API}/api/send-otp-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
      .then((res) => res.json())
      .then((body) => {
        setLoading(false);
        if (body.success) {
          setMsgType("success");
          setMsg(body.message || "OTP sent successfully ✅");
          setStep("otp");
          setTimerSec(DEFAULT_COOLDOWN);
        } else {
          setMsgType("error");
          setMsg(body?.message || "Failed to send OTP");
        }
      })
      .catch((err) => {
        setLoading(false);
        console.error("sendOtp error", err);
        setMsgType("error");
        setMsg("Something went wrong. Try again later.");
      });
  };

  const verifyOtp = async () => {
    const code = otpDigits.join("");
    setMsg("");
    if (!/^\d{6}$/.test(code)) {
      setMsgType("error");
      setMsg("Enter the 6-digit OTP you received.");
      return;
    }
    setLoading(true);

    try {
      const resp = await fetch(`${API}/api/verify-otp-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await resp.json();
      if (resp.ok && data.verified) {
        setMsgType("success");
        setMsg("Email verified ✅ Fill your details to complete registration.");
        setStep("register");
      } else {
        setMsgType("error");
        setMsg(data?.message || "Verification failed.");
      }
    } catch (err) {
      console.error("verifyOtp error", err);
      setMsgType("error");
      setMsg(err.message || "Server error");
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    setMsg("");

    if (!firstName.trim() || !lastName.trim()) {
      setMsgType("error");
      setMsg("Please enter your first and last name.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/register-email`, {
        email,
        firstName,
        lastName,
        address,
      });

      if (res.data && res.data.success) {
        setMsgType("success");
        setMsg("Registered successfully ✅");
        setStep("done");
        setUserData(res.data.user);
      } else {
        setMsgType("error");
        setMsg(res.data?.message || "Registration failed.");
      }
    } catch (err) {
      console.error("register error", err);
      setMsgType("error");
      setMsg(err.response?.data?.message || err.message || "Server error");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (val, index) => {
    if (!/^\d*$/.test(val)) return;
    const newOtp = [...otpDigits];
    newOtp[index] = val;
    setOtpDigits(newOtp);

    if (val && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const goBackToEmail = () => {
    setStep("email");
    setOtpDigits(["", "", "", "", "", ""]);
    setMsg("");
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2>Email OTP Registration</h2>

        {msg && (
          <div
            style={{
              backgroundColor: msgType === "success" ? "#d1fae5" : "#fee2e2",
              color: msgType === "success" ? "#065f46" : "#991b1b",
              border: `1px solid ${
                msgType === "success" ? "#10b981" : "#ef4444"
              }`,
              padding: "8px 10px",
              borderRadius: 6,
              marginBottom: 12,
              fontWeight: 500,
            }}
          >
            {msg}
          </div>
        )}

        {step === "email" && (
          <>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <button style={styles.button} onClick={sendOtp} disabled={loading}>
              {loading ? "Checking..." : "Continue"}
            </button>
          </>
        )}

        {step === "otp" && (
          <>
            <p>
              We sent a 6-digit code to <b>{email}</b>
            </p>

            <div style={styles.otpContainer}>
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputsRef.current[index] = el)}
                  type="text"
                  value={digit}
                  maxLength={1}
                  onChange={(e) => handleOtpChange(e.target.value, index)}
                  style={styles.otpBox}
                  disabled={loading}
                />
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                style={styles.button}
                onClick={verifyOtp}
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
              <button
                style={{
                  ...styles.button,
                  background: "#fff",
                  color: "#333",
                  border: "1px solid #ddd",
                }}
                onClick={resendOtp}
                disabled={timerSec > 0 || loading}
              >
                {timerSec > 0 ? `Resend in ${timerSec}s` : "Resend OTP"}
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                style={styles.link}
                onClick={goBackToEmail}
                disabled={loading}
              >
                Use a different email
              </button>
            </div>
          </>
        )}

        {step === "register" && (
          <>
            <p>
              Email verified: <b>{email}</b>
            </p>

            <label style={styles.label}>First Name</label>
            <input
              style={styles.input}
              type="text"
              placeholder="Your first name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={loading}
            />

            <label style={styles.label}>Last Name</label>
            <input
              style={styles.input}
              type="text"
              placeholder="Your last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={loading}
            />

            <label style={styles.label}>Address</label>
            <input
              style={styles.input}
              type="text"
              placeholder="Your address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={loading}
            />

            <button style={styles.button} onClick={register} disabled={loading}>
              {loading ? "Registering..." : "Complete Registration"}
            </button>
          </>
        )}

        {step === "done" && (
          <>
            <p>
              Welcome,{" "}
              <b>
                {userData?.firstName || firstName || "User"}{" "}
                {userData?.lastName || lastName || ""}
              </b>
            </p>
            <p>
              Email: <b>{userData?.email || email}</b>
            </p>
            {userData?.address && (
              <p>
                Address: <b>{userData.address}</b>
              </p>
            )}
            <button
              style={styles.button}
              onClick={() => window.location.reload()}
            >
              Register another
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f4f6f8",
    padding: 16,
  },
  card: {
    width: 420,
    maxWidth: "95%",
    background: "#fff",
    padding: 20,
    borderRadius: 8,
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  },
  label: { fontSize: 13, color: "#444", marginBottom: 6 },
  input: {
    width: "90%",
    padding: "10px 12px",
    marginBottom: 12,
    borderRadius: 6,
    border: "1px solid #ddd",
    fontSize: 14,
  },
  button: {
    padding: "10px 14px",
    borderRadius: 6,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },
  link: {
    background: "none",
    border: "none",
    color: "#2563eb",
    cursor: "pointer",
    textDecoration: "underline",
    padding: 0,
  },
  otpContainer: {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    marginBottom: "12px",
  },
  otpBox: {
    width: "40px",
    height: "40px",
    textAlign: "center",
    fontSize: "20px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },
};

export default App;
