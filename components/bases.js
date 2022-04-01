const embed_constructor = require("./embed_constructor");

exports.dependencies_reports = () => {
  let { generateDependencyReport } = require("@discordjs/voice");
  console.log(generateDependencyReport());
};

exports.errors = (errorMsg, message) => {
  return message.channel.send({
    embeds: [embed_constructor.error(errorMsg)],
  });
};
