import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

export default {
  plugins: [
    tailwindcss(),  // 注意这里是函数调用形式
    autoprefixer(), // 同样是函数形式
  ],
};
