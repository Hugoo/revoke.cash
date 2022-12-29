// TODO: Reduce the size of the video file somehow
const DemoVideo = () => {
  return (
    <div className="border border-black w-full max-w-5xl">
      <video autoPlay muted loop poster="/assets/images/demo-thumb.jpg">
        <source src="/assets/videos/demo.mp4" type="video/mp4" />
      </video>
    </div>
  );
};

export default DemoVideo;