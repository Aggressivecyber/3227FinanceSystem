/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Inter"', '"Noto Sans SC"', 'sans-serif'],
                display: ['"Oswald"', '"Noto Sans SC"', 'sans-serif'],
            },
            colors: {
                'xjtu-red': '#a41f35',
                'xjtu-light': '#c84e62',
                'xjtu-dark': '#7f1326',
            },
            boxShadow: {
                'bento': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                'bento-hover': '0 20px 25px -5px rgba(164, 31, 53, 0.1), 0 10px 10px -5px rgba(164, 31, 53, 0.04)',
            },
        },
    },
    plugins: [],
}
