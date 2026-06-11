interface TimestampToDateResult {
  year: string | number;
  month: string;
  day: string;
  time: string;
}

interface UtilObject {
  sliceAddress: (address: string) => string;
  getGrades: (grade: number) => string;
  numFormat: (
    number: number | string,
    decimals?: number,
    roundtag?: 'ceil' | 'floor' | 'round'
  ) => string;
  numFormat4Floor: (number: number | string) => string;
  numFormat6Floor: (number: number | string) => string;
  numFormat2Floor: (number: number | string) => string;
  numFormatBase: (number: number | string) => string;
  timestampToDate: (time: number) => TimestampToDateResult;
  showTime: (time: number) => string;
  isDefine: (para: any) => boolean;
  omitAddress: (address: string, length?: number) => string;
}

const util: UtilObject = {
  sliceAddress(address: string): string {
    return address.slice(0, 6) + '...' + address.slice(address.length - 4);
  },

  getGrades(grade: number): string {
    if (grade == -1) {
      return '注册用户';
    } else {
      return 'S' + grade;
    }
  },

  numFormat(
    number: number | string,
    decimals: number = 0,
    roundtag: 'ceil' | 'floor' | 'round' = 'ceil'
  ): string {
    number = (number + '').replace(/[^0-9+-Ee.]/g, '');
    const n = !isFinite(+number) ? 0 : +number;
    const prec = !isFinite(+decimals) ? 0 : Math.abs(decimals);
    const sep = ',';
    const dec = '.';

    const toFixedFix = function (n: number, prec: number): string {
      const k = Math.pow(10, prec);
      console.log();

      let roundedValue: number;
      switch (roundtag) {
        case 'ceil':
          roundedValue = Math.ceil(parseFloat((n * k).toFixed(prec * 2)));
          break;
        case 'floor':
          roundedValue = Math.floor(parseFloat((n * k).toFixed(prec * 2)));
          break;
        case 'round':
          roundedValue = Math.round(parseFloat((n * k).toFixed(prec * 2)));
          break;
        default:
          roundedValue = Math.ceil(parseFloat((n * k).toFixed(prec * 2)));
      }

      return '' + parseFloat(roundedValue.toFixed(prec * 2)) / k;
    };

    const s = (prec ? toFixedFix(n, prec) : '' + Math.round(n)).split('.');
    const re = /(-?\d+)(\d{3})/;

    if (s[0] !== undefined) {
      while (re.test(s[0])) {
        s[0] = s[0].replace(re, '$1' + sep + '$2');
      }
    }

    if ((s[1] || '').length < prec) {
      s[1] = s[1] || '';
      s[1] = s[1] + new Array(prec - (s[1]?.length || 0) + 1).join('0');
    }

    return s.join(dec);
  },

  numFormat4Floor(number: number | string): string {
    return this.numFormat(number, 4, 'floor');
  },

  numFormat6Floor(number: number | string): string {
    return this.numFormat(number, 6, 'floor');
  },

  numFormat2Floor(number: number | string): string {
    return this.numFormat(number, 2, 'floor');
  },

  numFormatBase(number: number | string): string {
    return this.numFormat(number, 0);
  },

  timestampToDate(time: number): TimestampToDateResult {
    const date = new Date(time * 1000);
    const Y = String(date.getFullYear());
    const M = date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : String(date.getMonth() + 1);
    const D = date.getDate() < 10 ? '0' + date.getDate() : String(date.getDate());
    const h = (date.getHours() < 10 ? '0' + date.getHours() : String(date.getHours())) + ':';
    const m = (date.getMinutes() < 10 ? '0' + date.getMinutes() : String(date.getMinutes())) + ':';
    const s = date.getSeconds() < 10 ? '0' + date.getSeconds() : String(date.getSeconds());

    return { year: Y, month: M, day: D, time: h + m + s };
  },

  showTime(time: number): string {
    if (time - 0 <= 0) {
      return '-';
    }
    const t = this.timestampToDate(time);
    return String(t.year) + '-' + t.month + '-' + t.day + ' ' + t.time;
  },

  isDefine(para: any): boolean {
    if (typeof para === 'undefined' || para === '' || para == null || para === undefined) {
      return false;
    } else {
      return true;
    }
  },

  omitAddress(address: string, length?: number): string {
    if (!this.isDefine(address)) {
      return '';
    }
    const len = length || 0;
    if (!this.isDefine(length) || address.length < len) {
      return address.substring(0, 8) + '...' + address.substring(address.length - 6);
    }

    const halfLength = Math.floor(len / 2);
    return (
      address.substring(0, halfLength) +
      '...' +
      address.substring(address.length - (len - halfLength))
    );
  },
};

export default util;
