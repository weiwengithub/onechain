import type { RoundingMode } from 'big.js';
import Big from 'big.js';

export function pow(base: number | string, exponent: number) {
  return new Big(base).pow(exponent).toString();
}

export function times(num1: number | string, num2: number | string, toFix?: number) {
  if (toFix !== undefined) {
    return new Big(num1).times(num2).toFixed(toFix, 0);
  }

  return new Big(num1).times(num2).toString();
}

export function plus(num1: number | string, num2: number | string, toFix?: number) {
  if (toFix !== undefined) {
    return new Big(num1).plus(num2).toFixed(toFix, 0);
  }

  return new Big(num1).plus(num2).toString();
}

export function sum(numbers: (number | string)[], toFix?: number): string {
  if (numbers.length === 0) {
    return toFix !== undefined ? new Big(0).toFixed(toFix, 0).toString() : '0';
  }

  return numbers.reduce<string>((acc, cur) => plus(acc, cur), toFix !== undefined ? new Big(0).toFixed(toFix, 0).toString() : '0');
}

export function equal(num1: number | string, num2: number | string) {
  return new Big(num1).eq(num2);
}

export function divide(num1: number | string, num2: number | string, toFix?: number) {
  if (toFix !== undefined) {
    return new Big(num1).div(num2).toFixed(toFix, 0);
  }

  return new Big(num1).div(num2).toString();
}

export function gt(num1: number | string, num2: number | string) {
  return new Big(num1).gt(num2);
}

export function gte(num1: number | string, num2: number | string) {
  return new Big(num1).gte(num2);
}

export function lt(num1: number | string, num2: number | string) {
  return new Big(num1).lt(num2);
}

export function lte(num1: number | string, num2: number | string) {
  return new Big(num1).lte(num2);
}

export function minus(num1: number | string, num2: number | string, toFix?: number) {
  if (toFix !== undefined) {
    return new Big(num1).minus(num2).toFixed(toFix, 0);
  }

  return new Big(num1).minus(num2).toString();
}

export function ceil(num: string | number) {
  const splitedNum = String(num).split('.');

  if (gt(splitedNum?.[1] || '0', '0')) {
    return new Big(num).plus('1').toFixed(0, 0);
  }

  return new Big(num).toFixed(0, 0);
}

export function fix(number: string, decimal?: number, optional: RoundingMode = 0) {
  try {
    return Big(number).toFixed(decimal, optional);
  } catch {
    return number;
  }
}

export function toDisplayDenomAmount(number: string | number, decimal: number) {
  if (decimal === 0) {
    return String(number);
  }

  return times(number, pow(10, -decimal), decimal);
}

export function toBaseDenomAmount(number: string | number, decimal: number) {
  if (decimal === 0) {
    return String(number);
  }

  return times(number, pow(10, decimal), 0);
}

export function isNumber(number: string) {
  try {
    Big(number);
  } catch {
    return false;
  }
  return true;
}

export function isDecimal(number: string, decimal: number) {
  if (!isNumber(number)) {
    return false;
  }

  const regex = new RegExp(`^([1-9][0-9]*\\.?[0-9]{0,${decimal}}|0\\.[0-9]{0,${decimal}}|0)$`);

  if (!regex.test(number)) {
    return false;
  }

  return true;
}

export function calculatePercentiles(numbers: number[], percentiles: number[]) {
  if (numbers.length === 0) {
    return [];
  }

  const sortedNumbers = numbers.slice().sort((a, b) => a - b);

  return percentiles.map((percentile) => {
    const index = Number(minus(ceil(times(divide(percentile, '100'), sortedNumbers.length)), '1'));
    return sortedNumbers[index];
  });
}

/**
 * 保留指定位数小数，并根据舍入方式处理
 * @param value 数值
 * @param decimals 保留小数位数
 * @param mode 舍入方式 ('round' | 'floor' | 'ceil')
 * @returns 处理后的数值
 */
export function formatDecimal(value: number | string, decimals = 0, mode: 'round' | 'floor' | 'ceil' = 'floor'): number {
  if (typeof value === 'string') {
    const _value = parseFloat(value);
    if (isNaN(_value)) {
      return NaN
    }
    value = _value;
  }
  if (!decimals) {
    if (value > 10000) {
      decimals = 2
    } else if (value > 100) {
      decimals = 4
    } else {
      decimals = 9
    }
  }
  const factor = Math.pow(10, decimals);
  let result: number;
  switch (mode) {
    case 'floor':
      result = Math.floor(value * factor) / factor;
      break;
    case 'ceil':
      result = Math.ceil(value * factor) / factor;
      break;
    case 'round':
    default:
      result = Math.round(value * factor) / factor;
      break;
  }
  return result;
}

/**
 * 格式化数字，使用自定义千位分隔符
 * @param {number} num - 需要格式化的数字
 * @param {string} separator - 自定义的千位分隔符，默认为逗号 ","
 * @returns {String} - 格式化后的数字字符串
 */
export function formatNumberWithSeparator(num: number | string, separator = ","): string {
  // 将数字转换为字符串
  const numStr = num.toString();
  // 如果是小数，分开整数部分和小数部分
  const [integerPart, decimalPart] = numStr.split(".");
  // 使用正则在整数部分插入千位分隔符
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  // 如果有小数部分，合并整数和小数部分
  if (decimalPart) {
    return `${formattedInteger}.${decimalPart}`;
  }
  return formattedInteger;
}
