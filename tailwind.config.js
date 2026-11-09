module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: require("./src/theme/colors"),
      fontFamily: {
        display: ["Fraunces_600SemiBold"],
        scientific: ["Fraunces_400Regular_Italic"],
        sans: ["Figtree_400Regular"],
        "sans-medium": ["Figtree_500Medium"],
        "sans-semibold": ["Figtree_600SemiBold"],
      },
      fontSize: {
        title: ["28px", "34px"],
        heading: ["20px", "26px"],
        body: ["16px", "24px"],
        label: ["14px", "20px"],
        scientific: ["14px", "20px"],
        caption: ["13px", "18px"],
      },
    },
  },
  plugins: [],
};
