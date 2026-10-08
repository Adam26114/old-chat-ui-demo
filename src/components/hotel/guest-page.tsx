import { useId, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, BedDouble, BellRing, Coffee, Leaf, Luggage, MapPin, Menu, Waves, Wifi, X } from "lucide-react";
import ChatBot from "../ChatBot";
import { Button } from "../ui/button";
import hotelIllustration from "../../assets/bay-hotel-illustration.png";
import "../../App.css";

const rooms = [
    { name: "A city retreat", label: "For the curious traveller", description: "A welcoming base for days spent exploring, and a quiet place to return to.", className: "room-city" },
    { name: "Room to unwind", label: "For a slower pace", description: "Unhurried mornings, a good book, and a little more time to make yourself at home.", className: "room-calm" },
    { name: "Stay together", label: "For shared adventures", description: "Make room for the people you travel with. Our concierge can help you find the right fit.", className: "room-together" },
];
const comforts = [
    { Icon: Wifi, title: "Stay connected", text: "Wi-Fi for planning your next stop, or simply checking in with home." },
    { Icon: Waves, title: "A poolside pause", text: "A refreshing break between city discoveries." },
    { Icon: Coffee, title: "A good start", text: "Ask about breakfast options before heading out for the day." },
    { Icon: Luggage, title: "Travel a little lighter", text: "Ask the concierge about luggage storage around your arrival or departure." },
];
const highlights = [
    { name: "Sentosa", label: "An island day out", text: "Beaches, attractions, and a change of pace just beyond the city.", url: "https://www.sentosa.com.sg/en/" },
    { name: "VivoCity", label: "Along the waterfront", text: "Browse the shops, find a new favourite dish, and enjoy the harbour.", url: "https://www.vivocity.com.sg/" },
    { name: "Mount Faber", label: "A different perspective", text: "Take in the harbour and city from a scenic cable-car ride.", url: "https://mountfaberleisure.com/attraction/singapore-cable-car/" },
];

function GuestPage({ chatbotProps }: { chatbotProps: ChatbotProp }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const navigationID = useId();
    const menuButton = useRef<HTMLButtonElement>(null);
    const widgetHost = useRef<HTMLDivElement>(null);
    const conciergeAvailable = Boolean(chatbotProps.app_key && chatbotProps.customer_id && import.meta.env.VITE_CHAT_SERVER && import.meta.env.VITE_CHAT_SERVER_KEY);
    const bookingLink = chatbotProps.booking_link?.trim();
    const askConcierge = () => {
        setMenuOpen(false);
        widgetHost.current?.querySelector<HTMLButtonElement>('.chat-launcher[aria-expanded="false"]')?.click();
    };
    const bookingControl = (className = "") => bookingLink ? (
        <Button asChild className={`hotel-button hotel-button-primary ${className}`}>
            <a href={bookingLink} target="_blank" rel="noopener noreferrer" title="Check availability (opens in a new tab)">Check availability<ArrowUpRight aria-hidden="true" /></a>
        </Button>
    ) : (
        <Button className={`hotel-button hotel-button-primary ${className}`} disabled={!conciergeAvailable} onClick={askConcierge}>Ask about a stay<ArrowRight aria-hidden="true" /></Button>
    );

    return (
        <div className="hotel-page" id="home">
            <a className="hotel-skip-link" href="#main-content">Skip to content</a>
            <header className="hotel-header" onKeyDown={(event) => {
                if (event.key === "Escape" && menuOpen) {
                    setMenuOpen(false);
                    menuButton.current?.focus();
                }
            }}>
                <div className="hotel-header-inner hotel-container">
                    <a href="#home" className="hotel-brand" aria-label="Bay Hotel Singapore home">
                        <span className="hotel-brand-mark" aria-hidden="true">B</span>
                        <span>Bay Hotel<span className="hotel-brand-location">Singapore</span></span>
                    </a>
                    <Button ref={menuButton} variant="ghost" size="icon" className="hotel-button hotel-menu-toggle" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} aria-controls={navigationID} onClick={() => setMenuOpen((value) => !value)}>
                        {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
                    </Button>
                    <nav id={navigationID} aria-label="Main navigation" className={`hotel-navigation ${menuOpen ? "is-open" : ""}`}>
                        <a href="#rooms" onClick={() => setMenuOpen(false)}>Rooms</a>
                        <a href="#comforts" onClick={() => setMenuOpen(false)}>Amenities</a>
                        <a href="#neighbourhood" onClick={() => setMenuOpen(false)}>Neighbourhood</a>
                        {bookingControl("hotel-nav-booking")}
                    </nav>
                </div>
            </header>
            <main id="main-content" tabIndex={-1}>
                <section className="hotel-hero hotel-container" aria-labelledby="welcome-title">
                    <div className="hotel-hero-copy">
                        <p className="hotel-eyebrow"><span aria-hidden="true" /> Singapore · HarbourFront</p>
                        <h1 id="welcome-title">A little calm.<br />A little closer.</h1>
                        <p className="hotel-hero-intro">Your corner of Singapore. Settle in, slow down, and let the city come to you.</p>
                        <div className="hotel-hero-actions">{bookingControl()}<a className="hotel-text-link" href="#rooms">Find your stay<ArrowRight aria-hidden="true" /></a></div>
                        <div className="hotel-hero-concierge">
                            <span className="hotel-concierge-icon"><BellRing aria-hidden="true" /></span>
                            <div><p>A little local knowledge goes a long way.</p><Button variant="ghost" className="hotel-button hotel-inline-button" onClick={askConcierge} disabled={!conciergeAvailable}>Ask the concierge<ArrowUpRight aria-hidden="true" /></Button></div>
                        </div>
                    </div>
                    <figure className="hotel-hero-art">
                        <img src={hotelIllustration} alt="Illustration of a peaceful green-and-ivory room overlooking a tropical harbour" width="1536" height="1024" fetchPriority="high" />
                        <figcaption><Leaf aria-hidden="true" /> An illustrated view of a slower Singapore stay.</figcaption>
                    </figure>
                </section>
                <div className="hotel-location-strip"><div className="hotel-container"><span><MapPin aria-hidden="true" /> At home in HarbourFront</span><span>A city to discover. A place to come back to.</span></div></div>
                <section id="rooms" tabIndex={-1} className="hotel-section hotel-container" aria-labelledby="rooms-title">
                    <div className="hotel-section-heading"><div><p className="hotel-eyebrow">Make yourself at home</p><h2 id="rooms-title">Find your kind of stay.</h2></div><p>For a city escape or a few days together, start with the way you want to feel. Ask our concierge about available room options.</p></div>
                    <div className="hotel-rooms">{rooms.map((room) => <article key={room.name} className={`hotel-room ${room.className}`}>
                        <div className="hotel-room-symbol" aria-hidden="true"><BedDouble /></div>
                        <p className="hotel-room-label">{room.label}</p><h3>{room.name}</h3><p className="hotel-room-description">{room.description}</p>
                        <Button variant="ghost" className="hotel-button hotel-inline-button" onClick={askConcierge} disabled={!conciergeAvailable}>Ask about rooms<ArrowUpRight aria-hidden="true" /></Button>
                    </article>)}</div>
                </section>
                <section id="comforts" tabIndex={-1} className="hotel-comforts" aria-labelledby="comforts-title">
                    <div className="hotel-container hotel-comforts-inner">
                        <div className="hotel-comforts-heading"><p className="hotel-eyebrow">The little things</p><h2 id="comforts-title">Less to think about.<br />More time to enjoy.</h2><p>Make a little room in your day for comfort. We’re here to help with the details.</p><Button variant="outline" className="hotel-button hotel-button-light" onClick={askConcierge} disabled={!conciergeAvailable}>Ask the concierge<ArrowUpRight aria-hidden="true" /></Button></div>
                        <div className="hotel-comforts-grid">{comforts.map(({ Icon, title, text }) => <article key={title}><Icon aria-hidden="true" /><h3>{title}</h3><p>{text}</p></article>)}</div>
                    </div>
                </section>
                <section id="neighbourhood" tabIndex={-1} className="hotel-section hotel-container" aria-labelledby="neighbourhood-title">
                    <div className="hotel-section-heading"><div><p className="hotel-eyebrow">Step outside</p><h2 id="neighbourhood-title">A good place to begin.</h2></div><p>Follow the waterfront, head for the hills, or make a day of the island. A few favourites to get you started.</p></div>
                    <div className="hotel-highlights">{highlights.map((place) => <a key={place.name} href={place.url} target="_blank" rel="noopener noreferrer" className="hotel-highlight" title={`Explore ${place.name} (opens in a new tab)`}>
                        <div className="hotel-highlight-top"><p className="hotel-eyebrow">{place.label}</p><ArrowUpRight aria-hidden="true" /></div>
                        <h3>{place.name}</h3><p>{place.text}</p><span className="hotel-highlight-link">Explore {place.name}</span>
                    </a>)}</div>
                </section>
                <section id="stay" className="hotel-stay" aria-labelledby="stay-title"><div className="hotel-container hotel-stay-inner">
                    <div><p className="hotel-eyebrow">Your next chapter</p><h2 id="stay-title">The rest starts with a room.</h2><p>Have dates in mind? Explore your options, or ask us a question first.</p>{!conciergeAvailable && <p className="hotel-service-note" role="status">Our online concierge is unavailable right now.</p>}</div>
                    <div className="hotel-stay-actions">{bookingControl()}<Button variant="ghost" className="hotel-button hotel-inline-button" disabled={!conciergeAvailable} onClick={askConcierge}>Ask the concierge<ArrowUpRight aria-hidden="true" /></Button></div>
                </div></section>
            </main>
            <footer className="hotel-footer hotel-container"><div><a href="#home" className="hotel-footer-brand">Bay Hotel Singapore</a><p>Your Singapore stay, thoughtfully connected.</p></div><div className="hotel-footer-meta"><span>HarbourFront, Singapore</span><span>Bay Hotel guest experience · Demo</span></div></footer>
            <div ref={widgetHost}>{conciergeAvailable && <ChatBot {...chatbotProps} />}</div>
        </div>
    );
}

export default GuestPage;
