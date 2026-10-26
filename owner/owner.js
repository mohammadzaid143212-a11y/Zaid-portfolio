/* Owner Studio authentication and password recovery.
   Only the publishable/anon key belongs in browser code. Never use service_role/secret keys here. */
(() => {
  const SUPABASE_URL = "https://rtaedoseedjwljixmrgy.supabase.co";
  const SUPABASE_PUBLIC_KEY = "sb_publishable__Oc_xT1AELiVIQgCgXytTQ_qxLd_ZFo";
  const OWNER_EMAIL = "mohammadzaid143212@gmail.com".toLowerCase();

  const loginView = document.querySelector("#login-view");
  const recoveryView = document.querySelector("#recovery-view");
  const dashboardView = document.querySelector("#dashboard-view");
  const form = document.querySelector("#login-form");
  const message = document.querySelector("#auth-message");
  const loginButton = document.querySelector("#login-button");
  const resetButton = document.querySelector("#reset-button");
  const recoveryForm = document.querySelector("#recovery-form");
  const recoveryMessage = document.querySelector("#recovery-message");
  const savePasswordButton = document.querySelector("#save-password-button");
  const logoutButton = document.querySelector("#logout-button");
  const signedInAs = document.querySelector("#signed-in-as");
  let recoveryMode = false;

  function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("error", isError);
  }
  function showRecoveryMessage(text, isError = false) {
    recoveryMessage.textContent = text;
    recoveryMessage.classList.toggle("error", isError);
  }
  function hideViews() {
    loginView.classList.add("hidden");
    recoveryView.classList.add("hidden");
    dashboardView.classList.add("hidden");
  }
  function showLogin() {
    hideViews();
    loginView.classList.remove("hidden");
  }
  function showRecovery() {
    recoveryMode = true;
    hideViews();
    recoveryView.classList.remove("hidden");
    showRecoveryMessage("");
  }
  function showDashboard(user) {
    recoveryMode = false;
    hideViews();
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

  client.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") {
      showRecovery();
      return;
    }
    if (event === "SIGNED_OUT" && !recoveryMode) showLogin();
    if (event === "SIGNED_IN" && session && !recoveryMode) {
      if ((session.user.email || "").toLowerCase() === OWNER_EMAIL) showDashboard(session.user);
      else {
        client.auth.signOut();
        showLogin();
        showMessage("This account is not authorized for Owner Studio.", true);
      }
    }
  });

  async function checkSession() {
    const { data, error } = await client.auth.getSession();
    if (recoveryMode) return;
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
    resetButton.disabled = true;
    showMessage("");
    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/owner/"
      });
      if (error) throw error;
      showMessage("If password recovery is available, Supabase will email you a reset link. Check Inbox and Spam.");
    } catch (error) {
      showMessage(error.message || "Could not request a reset link. Please try again.", true);
    } finally {
      resetButton.disabled = false;
    }
  });

  recoveryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = document.querySelector("#new-password").value;
    const confirmation = document.querySelector("#confirm-password").value;
    if (password.length < 8) return showRecoveryMessage("Use at least 8 characters for your new password.", true);
    if (password !== confirmation) return showRecoveryMessage("The passwords do not match. Please try again.", true);

    savePasswordButton.disabled = true;
    savePasswordButton.textContent = "Saving password…";
    showRecoveryMessage("");
    try {
      const { data, error } = await client.auth.updateUser({ password });
      if (error) throw error;
      document.querySelector("#new-password").value = "";
      document.querySelector("#confirm-password").value = "";
      showRecoveryMessage("Password updated successfully. You can now use it to sign in.");
      if ((data.user?.email || "").toLowerCase() === OWNER_EMAIL) {
        window.setTimeout(() => showDashboard(data.user), 1200);
      } else {
        recoveryMode = false;
        showLogin();
        showMessage("Password updated. Please sign in with your new password.");
      }
    } catch (error) {
      showRecoveryMessage(error.message || "Could not update the password. The link may have expired; request a new one.", true);
    } finally {
      savePasswordButton.disabled = false;
      savePasswordButton.innerHTML = 'Save new password <span aria-hidden="true">↗</span>';
    }
  });

  logoutButton.addEventListener("click", async () => {
    recoveryMode = false;
    await client.auth.signOut();
    showLogin();
    showMessage("You have signed out.");
  });

  checkSession();
})();