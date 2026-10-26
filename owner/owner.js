/* Owner Studio authentication.
   Replace SUPABASE_PUBLIC_KEY with the project's publishable/anon public key.
   Never put a service_role/secret key in browser code. */
(() => {
  const SUPABASE_URL = "https://rtaedoseedjwlijxmrgv.supabase.co";
  const SUPABASE_PUBLIC_KEY = "sb_publishable__Oc_xT1AELiVIQgCgXytTQ_qxLd_ZFo";
  const OWNER_EMAIL = "mohammadzaid143212@gmail.com".toLowerCase();

  const loginView = document.querySelector("#login-view");
  const dashboardView = document.querySelector("#dashboard-view");
  const form = document.querySelector("#login-form");
  const message = document.querySelector("#auth-message");
  const loginButton = document.querySelector("#login-button");
  const resetButton = document.querySelector("#reset-button");
  const logoutButton = document.querySelector("#logout-button");
  const signedInAs = document.querySelector("#signed-in-as");

  function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("error", isError);
  }
  function showLogin() {
    loginView.classList.remove("hidden");
    dashboardView.classList.add("hidden");
  }
  function showDashboard(user) {
    loginView.classList.add("hidden");
    dashboardView.classList.remove("hidden");
    signedInAs.textContent = user?.email ? "Signed in as " + user.email : "Authenticated owner";
  }

  if (!window.supabase || SUPABASE_PUBLIC_KEY.includes("PASTE_")) {
    showMessage("Setup needed: add your Supabase publishable (public) key in owner/owner.js before signing in.", true);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      showMessage("Supabase public key has not been configured yet. Follow the setup instructions first.", true);
    });
    resetButton.addEventListener("click", () => showMessage("Add the Supabase public key first, then password recovery can be enabled.", true));
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);

  async function checkSession() {
    const { data, error } = await client.auth.getSession();
    if (error || !data.session) return showLogin();
    if ((data.session.user.email || "").toLowerCase() !== OWNER_EMAIL) {
      await client.auth.signOut();
      showLogin();
      showMessage("This account is not authorized for Owner Studio.", true);
      return;
    }
    showDashboard(data.session.user);
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showMessage("");
    loginButton.disabled = true;
    loginButton.textContent = "Signing in…";
    const email = document.querySelector("#email").value.trim().toLowerCase();
    const password = document.querySelector("#password").value;
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if ((data.user?.email || "").toLowerCase() !== OWNER_EMAIL) {
        await client.auth.signOut();
        throw new Error("This account is not authorized for Owner Studio.");
      }
      showDashboard(data.user);
    } catch (error) {
      showMessage(error.message || "Sign-in failed. Check your email and password.", true);
    } finally {
      loginButton.disabled = false;
      loginButton.innerHTML = 'Sign in <span aria-hidden="true">↗</span>';
    }
  });
  resetButton.addEventListener("click", async () => {
    const email = document.querySelector("#email").value.trim().toLowerCase();
    if (!email) return showMessage("Enter your owner email first, then tap Forgot password.", true);
    if (email !== OWNER_EMAIL) return showMessage("Password recovery is only available for the owner email.", true);
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/owner/"
    });
    showMessage(error ? error.message : "If password recovery is available, Supabase will email you a reset link.", Boolean(error));
  });
  logoutButton.addEventListener("click", async () => {
    await client.auth.signOut();
    showLogin();
    showMessage("You have signed out.");
  });
  checkSession();
})();