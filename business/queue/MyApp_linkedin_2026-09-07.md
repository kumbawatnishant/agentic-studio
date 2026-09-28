So, I finally shipped a side project I’ve been hacking on over the weekends: **MyApp** 🚀

It’s a lightweight productivity tool designed for developers who want a quick, clean way to track daily tasks without all the bloat of traditional tools. 

I built it using **Next.js** and **Tailwind CSS**. 

One fun challenge I hit was dealing with dark mode flickering on page load with server-side rendering. Nothing breaks the vibe quite like getting flashbang-brightened by a white screen at 1 AM. I solved it by running a tiny inline script in the document head to read the user's theme preference *before* the DOM paints, keeping the renders fast and flicker-free. 

It feels great to get this out into the wild! 

Feedback welcome—let me know what you think if you give it a spin!

#webdev #nextjs #buildinpublic
