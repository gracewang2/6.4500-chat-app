export default {
  template: `
    <div class="profile-summary">
      <img :src="profile.picture || '../assets/default-profile-pic.png'" class="profile-pic" />
      <div class="profile-info">
        <h3>{{ profile.name || "Anonymous" }}</h3>
        <p>{{ profile.bio || "" }}</p>
      </div>
    </div>
  `,
  props: {
    profile: {
      type: Object,
      required: true,
      default: () => ({ name: "", bio: "", picture: "" }),
    },
  },
};

console.log("Component loaded");
