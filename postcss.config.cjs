module.exports = {
    plugins: [
        require("tailwindcss"),
        {
            postcssPlugin: "scope-chat-base-variables",
            Rule(rule) {
                // Tailwind's variable defaults also need scoping in a page embed.
                if (rule.selector === "*, ::before, ::after") rule.selector = ".ubiq-chat, .ubiq-chat *, .ubiq-chat ::before, .ubiq-chat ::after";
                if (rule.selector === "::backdrop") rule.selector = ".ubiq-chat ::backdrop";
            },
        },
        require("autoprefixer"),
    ],
};
