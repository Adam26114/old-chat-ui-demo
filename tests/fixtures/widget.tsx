import ReactDOM from "react-dom/client";
import ChatBot from "../../src/components/ChatBot";
import { useState } from "react";

const options = new URLSearchParams(window.location.search);
const booking = options.get("booking") !== "none";

export function Fixture() {
    const [mounted, setMounted] = useState(true);
    return <>
    {options.get("unmount") === "yes" ? <button onClick={() => setMounted(false)}>Unmount chat</button> : null}
    {mounted ? (
    <ChatBot
        recaptcha_site_key={options.get("captcha") === "both" || options.get("captcha") === "site" ? "fixture-site-key" : ""}
        recaptcha_endpoint={options.get("captcha") === "both" || options.get("captcha") === "endpoint" ? "http://127.0.0.1:4181/verify" : ""}
        app_key="ui-test"
        customer_id="test-hotel"
        property_code={options.get("greeting") === "none" ? "no-greeting" : "test-property"}
        chatbox_title="Hotel guest assistant"
        booking_link={booking ? "http://127.0.0.1:4180/tests/fixtures/booking.html" : undefined}
    />
    ) : null}
    </>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(<Fixture />);
