/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{js,jsx,ts,tsx}", // 这是关键，告诉 Tailwind 扫描哪些文件
    ],
    theme: {
        extend: {},
    },
    plugins: [],
}
