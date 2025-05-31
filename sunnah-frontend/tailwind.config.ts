/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}", // لمجلد app إذا كنت تستخدم App Router
    "./pages/**/*.{js,ts,jsx,tsx,mdx}", // لمجلد pages إذا كنت تستخدم Pages Router
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // لأي مجلد components
    // أو بشكل أعم ليشمل كل شيء داخل src أو المشروع مباشرةً
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./*.{js,ts,jsx,tsx,mdx}", // إذا كانت هناك ملفات في الجذر مباشرة
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}