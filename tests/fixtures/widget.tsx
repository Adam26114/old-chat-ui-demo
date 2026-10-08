import ReactDOM from "react-dom/client";
import ChatBot from "../../src/components/ChatBot";

const options = new URLSearchParams(window.location.search);
const booking = options.get("booking") !== "none";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <ChatBot
        app_key="ui-test"
        customer_id="test-hotel"
        property_code={options.get("greeting") === "none" ? "no-greeting" : "test-property"}
        chatbox_title="Hotel guest assistant"
        booking_link={booking ? "http://127.0.0.1:4180/tests/fixtures/booking.html" : undefined}
    />,
);
