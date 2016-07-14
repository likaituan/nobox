
//英文规则提示
module.exports = {
    empty: "{0} cannon empty",

    //格式
    number: "{0} required a valid number",
    chinese: "{0} required chinese",
    number_or_letter: "{0} cannon contains exception character by number or letter or underline",
    number_and_letter: "{0} required combination of numbers and letters",
    format: "{0} format is wrong",

    //数字大小
    more_than: "{0} required more than {1}",
    less_than: "{0} required less then {2}",
    min: "{0} cannon less than {1} {2}",
    max: "{0} cannon more than {1} {2}",
    between: "{0} only between {1} and {2}",

    //数字位数
    bit: "number of {0} digits is wrong",
    minBit: "number of {0} digits cannon less than {1}",
    maxBit: "number of {0} digits cannon more than {1}",

    //字符串长度
    len: "{0} length is wrong",
    minLen: "{0} length cannon less than {1}{2}",
    maxLen: "{0} length cannon more than {1}{2}",

    //字节长度
    byte: "{0} only has {1} chinese or {2} english",
    minByte: "{0} length cannon less than {1} double byte or {2} single byte",
    maxByte: "{0} length cannon more than {1} double byte or {2} single byte",

    //日期
    minDate: "{0} cannon less than {1} days",
    maxDate: "{0} cannon more than {1} days",

    //是否一致
    diff: "Two times the password is not consistent"
};