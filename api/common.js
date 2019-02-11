/* eslint-disable linebreak-style */
module.exports = {
  generateNo: async ({ baseNo, noModel, type = '通用', length = 5 }) => {
    // 这里无法取到model，只能通过参数传递；
    let install = false;
    let no = '';
    let times = 0;
    while (!install && ++times < 200) {
      // {no:"ZZ20181200001"};//
      const result = await noModel.findOne({
        where: { type, no: { $like: `${baseNo}%` } },
        order: [['no', 'desc']],
      });
      no = '1';
      if (result) {
        no = (+result.no.substr(result.no.length - length, length) + 1).toString();
      }
      no = `${baseNo}${'0000000000'.substr(0, length - no.length)}${no}`;

      try {
        install = await noModel.build({ type, no }).save();
      } catch (error) {
        console.log(error, install, 'no');
        install = false;
      }
    }
    // console.log(baseNo, no);
    return no;
  },
}
