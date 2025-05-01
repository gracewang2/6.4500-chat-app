import { createApp } from "vue";
import { GraffitiLocal } from "@graffiti-garden/implementation-local";
import { GraffitiRemote } from "@graffiti-garden/implementation-remote";
import { GraffitiPlugin } from "@graffiti-garden/wrapper-vue";

// export const graffiti = new GraffitiLocal();
export const graffiti = new GraffitiRemote();

export const getProfile = async (actorURL, graffiti) => {
  const profile = await graffiti.get({ url: actorURL });
  if (profile) return profile.value;
  return null;
};

export const saveProfile = async (profileData, sessionStorage, graffiti) => {
  await graffiti.put(
    {
      value: {
        name: profileData.name,
        bio: profileData.bio,
        picture: profileData.picture || "default-profile-pic.png",
        updated: Date.now(),
      },
      channels: [session.actor], // store in the user's own channel
    },
    session
  );
};
