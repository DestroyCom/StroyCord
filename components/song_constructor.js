exports.song = async (songInfo, message, minutes, seconds) => {
  return {
    title: songInfo.video_details.title,
    url: songInfo.video_details.url,
    thumbnail:
      songInfo.video_details.thumbnails[
        songInfo.video_details.thumbnails.length - 1
      ].url,
    requestAuthor: message.author,
    querySearch: "p",
    videoAuthor: songInfo.video_details.channel.name,
    videoLength: minutes + ":" + seconds,
  };
};
