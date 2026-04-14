const { EmbedBuilder } = require('discord.js');

const BRAND_COLOR = 0x2b2d31; // Dark, clean Crime brand color
const SUCCESS_COLOR = 0x2ecc71;
const ERROR_COLOR = 0xe74c3c;
const WARN_COLOR = 0xf39c12;
const INFO_COLOR = 0x3498db;

function crimeEmbed(options = {}) {
  const embed = new EmbedBuilder()
    .setColor(options.color || BRAND_COLOR)
    .setTimestamp();

  if (options.title) embed.setTitle(options.title);
  if (options.description) embed.setDescription(options.description);
  if (options.fields) embed.addFields(options.fields);
  if (options.footer) embed.setFooter({ text: options.footer });
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.image) embed.setImage(options.image);

  return embed;
}

function successEmbed(description, title = null) {
  return crimeEmbed({ color: SUCCESS_COLOR, title: title || '✅ Success', description });
}

function errorEmbed(description, title = null) {
  return crimeEmbed({ color: ERROR_COLOR, title: title || '❌ Error', description });
}

function warnEmbed(description, title = null) {
  return crimeEmbed({ color: WARN_COLOR, title: title || '⚠️ Warning', description });
}

function infoEmbed(description, title = null) {
  return crimeEmbed({ color: INFO_COLOR, title, description });
}

module.exports = { crimeEmbed, successEmbed, errorEmbed, warnEmbed, infoEmbed, BRAND_COLOR };
