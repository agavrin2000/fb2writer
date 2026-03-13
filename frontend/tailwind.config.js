/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // Пути к вашим файлам в Next.js (App Router или Pages Router)
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // Если используете папку src
    
    // ВАЖНО: Добавьте путь к вашим Tiptap расширениям, 
    // если вы прописываете классы прямо в JS-файлах узлов
    "./path/to/your/tiptap/extensions/**/*.{js,ts}", 
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}