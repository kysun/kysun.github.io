[y, fs, nbits]=wavread('./sample2_raw.wav');
    fs2=44100;
    wavwrite(y,fs2,nbits2,'./sample2.wav');