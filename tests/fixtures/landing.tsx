import ReactDOM from "react-dom/client";
import GuestPage from "../../src/components/hotel/guest-page";
import "../../src/index.css";

const options = new URLSearchParams(window.location.search);

ReactDOM.createRoot(document.getElementById("root")!).render(
    <GuestPage chatbotProps={{
        app_key: options.get("chat") === "none" ? "" : "ui-test",
        customer_id: "test-hotel",
        property_code: "test-property",
        chatbox_title: "Bay Hotel Singapore",
        booking_link: options.get("booking") === "none" ? undefined : "http://127.0.0.1:4180/tests/fixtures/booking.html",
    }} />,
);
