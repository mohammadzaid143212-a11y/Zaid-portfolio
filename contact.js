// Public contact destinations supplied by the portfolio owner.
const CONTACT_EMAIL = "mohammadzaid143212@gmail.com";
const WHATSAPP_NUMBER = "918857020261"; // India country code + 10-digit number.
const INSTAGRAM_URL = "https://www.instagram.com/the_shaikhzaid/";

const inquiryForm = document.querySelector("#inquiry-form");
const formStatus = document.querySelector("#form-status");
const footerYear = document.querySelector("#year");
if (footerYear) footerYear.textContent = new Date().getFullYear();

if (inquiryForm) {
  inquiryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!inquiryForm.reportValidity()) return;
    const data = new FormData(inquiryForm);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const projectType = String(data.get("projectType") || "");
    const budget = String(data.get("budget") || "");
    const deadline = String(data.get("deadline") || "Flexible");
    const details = String(data.get("details") || "").trim();
    const method = String(data.get("method") || "email");
    const subject = encodeURIComponent("Portfolio inquiry — " + projectType);
    const body = encodeURIComponent(
      "New portfolio project inquiry\n\n" +
      "Name: " + name + "\nEmail: " + email + "\nProject: " + projectType +
      "\nBudget: " + budget + "\nDeadline: " + deadline +
      "\nPreferred contact: " + method + "\n\nProject details:\n" + (details || "Not provided")
    );
    if (method === "email") {
      if (!CONTACT_EMAIL || CONTACT_EMAIL === "hello@example.com") {
        formStatus.textContent = "Email is selected. The page owner needs to add their real email address before inquiries can be addressed correctly.";
        return;
      }
      window.location.href = "mailto:" + CONTACT_EMAIL + "?subject=" + subject + "&body=" + body;
      formStatus.textContent = "Your email app should open with the inquiry prepared. Please review and press Send.";
    } else if (method === "whatsapp") {
      if (!/^\d{8,15}$/.test(WHATSAPP_NUMBER)) {
        formStatus.textContent = "WhatsApp is selected, but the page owner must configure their WhatsApp number first.";
        return;
      }
      window.open("https://wa.me/" + WHATSAPP_NUMBER + "?text=" + body, "_blank", "noopener,noreferrer");
      formStatus.textContent = "WhatsApp opened with your inquiry prepared. Please review and send it.";
    } else if (method === "instagram") {
      if (!INSTAGRAM_URL || new URL(INSTAGRAM_URL).hostname !== "www.instagram.com") {
        formStatus.textContent = "Instagram is selected, but the page owner must add their Instagram profile link first.";
        return;
      }
      window.open(INSTAGRAM_URL, "_blank", "noopener,noreferrer");
      formStatus.textContent = "Instagram opened. Copy your inquiry details from the form and send them in a DM.";
    }
  });
}