import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useMeta } from "../context/MetaContext";
import { CitySelect } from "../components/ui";

export default function Register() {
  const { register } = useAuth();
  const { meta, city } = useMeta();
  const navigate = useNavigate();
  const [role, setRole] = useState("shop");
  const [form, setForm] = useState({ organisationName: "", email: "", password: "", areaId: "", inviteCode: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const cityAreas = meta.areas.filter((a) => a.cityId === city);
  const areaId = cityAreas.some((a) => a.id === form.areaId) ? form.areaId : cityAreas[0]?.id;
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (role === "ngo" && !form.organisationName.trim()) return setError("Enter your organisation name.");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError("Enter a valid email address.");
    if (form.password.length < 8) return setError("Use at least 8 characters for the password.");
    if (role === "shop" && !form.inviteCode.trim()) return setError("Enter the invite code your NGO gave you.");

    const payload =
      role === "shop"
        ? { role, email: form.email.trim(), password: form.password, cityId: city, areaId, inviteCode: form.inviteCode.trim() }
        : { role, email: form.email.trim(), password: form.password, cityId: city, organisationName: form.organisationName.trim() };

    setBusy(true);
    try {
      const u = await register(payload);
      navigate(u.role === "ngo" ? "/ngo" : "/report", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid2">
      <form className="card" onSubmit={onSubmit} noValidate>
        <h1>Create an account</h1>
        <fieldset className="role-pick">
          <legend>I am a</legend>
          <label>
            <input type="radio" name="role" value="shop" checked={role === "shop"} onChange={() => setRole("shop")} /> Scrap shop
          </label>
          <label>
            <input type="radio" name="role" value="ngo" checked={role === "ngo"} onChange={() => setRole("ngo")} /> NGO or
            waste-picker collective
          </label>
        </fieldset>

        {role === "ngo" && (
          <label className="field" htmlFor="reg-org">
            Organisation name
            <input id="reg-org" value={form.organisationName} onChange={set("organisationName")} />
          </label>
        )}
        <label className="field" htmlFor="reg-email">
          Email
          <input id="reg-email" type="email" autoComplete="email" value={form.email} onChange={set("email")} />
        </label>
        <label className="field" htmlFor="reg-password">
          Password (8 or more characters)
          <input id="reg-password" type="password" autoComplete="new-password" value={form.password} onChange={set("password")} />
        </label>
        <CitySelect id="reg-city" />
        {role === "shop" && (
          <>
            <label className="field" htmlFor="reg-area">
              Area
              <select id="reg-area" value={areaId} onChange={set("areaId")}>
                {cityAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" htmlFor="reg-code">
              Invite code from your NGO
              <input id="reg-code" placeholder="e.g. PUNE-NGO-4821" value={form.inviteCode} onChange={set("inviteCode")} />
            </label>
          </>
        )}
        <div className="form-actions">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Creating account…" : "Create account"}
          </button>
          {error && (
            <span className="field-error" role="alert">
              {error}
            </span>
          )}
        </div>
        <p className="note">
          {role === "shop"
            ? "We do not store your shop name or phone number. Your area is used only to show you local ranges."
            : "NGO accounts are checked by the team before the NGO view unlocks."}
        </p>
        <p className="note">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
      <div className="card">
        <h2>Why invite codes for shops?</h2>
        <p className="muted">
          Partner NGOs onboard shops and verify early data. The code links each shop to its NGO, which keeps fake reports
          out without asking shops for personal details.
        </p>
      </div>
    </div>
  );
}
