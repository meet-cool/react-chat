export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        'none': '0px',
        'sm': '3px',
        'DEFAULT': '0px',
        'md': '0px',
        'lg': '0px',
        'xl': '0px',
        '2xl': '0px',
        '3xl': '0px',
        'full': '0px',
      },
      fontFamily: {
        'sans': ['-apple-system', 'PingFang SC', 'Microsoft YaHei', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
