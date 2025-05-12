import { createApp } from "vue";
import { getProfile, saveProfile } from "../shared/shared.js";
import { GraffitiPlugin } from "@graffiti-garden/wrapper-vue";
import { GraffitiRemote } from "@graffiti-garden/implementation-remote";

/** components (hw11) */
import ProfileSummary from "../shared/ProfileSummary.js";

const app = createApp({
  data() {
    return {
      /** messaging */
      myMessage: "",
      sending: false,
      currentChannel: null, // tracks current channel (null = home page)
      // TODO: if null, don't show message sending bar

      /** editing messages */
      editingMessage: null, // stores (url, editContent): the message being edited and edited content

      /** profile information */
      profile: { name: "", bio: "", picture: "" },

      /** chats */
      chats: [], // {channel: string, time: number, name: string}
      showCreateChatModal: false,
      userSearchQuery: "",
      searchResults: [],

      /** profile modal + active tab */
      activeTab: "Chat", // "Chat" or "Learn"
      showProfileMenu: false,
      showProfileModal: false,
      showUpdatedGreenCheck: false,
      updatedGreenCheckTimeout: null,

      /** creating new profile upon creating a new account */
      showNewProfileModal: false,

      /** profile picture fields */
      uploadProgress: 0,
      maxFileSize: 4 * 1024 * 1024, // 4 MB
      allowedTypes: ["image/png", "image/jpg"],

      /** creating new DM */
      showCreateChatModal: false,
    };
  },

  // created lifecycle hook: executes after the component instance has been initialized
  async created() {
    // on startup, load current user's profile
    if (this.$graffitiSession.value) {
      profile = await getProfile(
        this.$graffitiSession.value.actor,
        this.$graffiti
      );
      if (profile?.data) {
        this.profile = profile;
      } else {
        // new user - show profile modal immediately (TODO: replace with new modal)
        console.log("NEW USER");
        this.showNewProfileModal = true;
      }
    }
  },

  methods: {
    async sendMessage(session) {
      if (!this.myMessage || !this.currentChannel) return; // Disable the send button when the message text is empty

      this.sending = true;

      // Essentially does the same thing as this.sentMessageObjects.push()
      // but instead of adding your message to the local sentMessageObjects array,
      // it adds it to a shared "channel" specified in the channels variable.
      try {
        await this.$graffiti.put(
          {
            value: {
              content: this.myMessage,
              published: Date.now(),
            },
            channels: [this.currentChannel],
          },
          session
        );
      } catch (error) {
        console.log("Failed to send message: ", error);
      }

      this.sending = false;
      this.myMessage = ""; // Clear the message once it has been sent

      // Refocus the input field after sending the message
      await this.$nextTick();
      this.$refs.messageInput.focus();
    },

    // save the edited message
    async saveEdit(session) {
      if (!this.editingMessage) return;
      await this.$graffiti.patch(
        {
          value: [
            {
              op: "replace",
              path: "/content",
              value: this.editingMessage.content,
            },
          ],
        },
        { url: this.editingMessage.url },
        session
      );
      this.cancelEdit();
    },

    async deleteMessage(message, session) {
      if (confirm("Delete this message?")) {
        try {
          await this.$graffiti.delete(message, session);
        } catch (error) {
          console.error("Failed to delete message: ", error);
        }
      }
    },

    // starting editing a message
    startEditing(message) {
      this.editingMessage = {
        url: message.url,
        content: message.value.content,
      };
    },

    cancelEdit() {
      this.editingMessage = null;
    },

    async updateProfile() {
      console.log(this.profile);
      if (!this.$graffitiSession.value) return;
      await saveProfile(
        // implemented in shared.js
        this.profile,
        this.$graffitiSession.value,
        this.$graffiti
      );

      this.showUpdatedGreenCheck = true;

      // clear any existing timeout
      if (this.updatedGreenCheckTimeout)
        clearTimeout(this.updatedGreenCheckTimeout);

      // hide after 3 seconds
      this.updatedGreenCheckTimeout = setTimeout(() => {
        this.showUpdatedGreenCheck = false;
      }, 3000);
    },

    // set default profile pic
    setDefaultPic() {
      this.profile.picture = "/assets/default-profile-pic.png";
    },

    // switch to "Chat" or "Learn"
    switchTab(tab) {
      this.activeTab = tab;
    },

    async handlePictureUpload(event) {
      // TODO
      const file = event.target.files[0];

      // validate file
      if (!file) return;
      if (!this.allowedTypes.includes(file.type)) {
        alert("Currently, we only allow PNG or JPG!");
        return;
      }
      if (file.size > this.maxFileSize) {
        alert("Image must be smaller than 4 MB!");
        return;
      }

      try {
        // create preview while uploading
        const previewUrl = URL.createObjectURL(file);
        this.profile.picture = previewUrl;
        const base64Image = await this.convertToBase64(file);
        this.profile.picture = base64Image;
      } catch (error) {
        this.profile.picture = "../assets/default-profile-pic.png";
      }
    },

    // convertToBase64 for profile picture uploading (in the future, sending files)
    convertToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
      });
    },

    toggleProfileMenu() {
      this.showProfileMenu = !this.showProfileMenu;
      this.showProfileModal = false;
    },

    openProfileModal() {
      this.showProfileMenu = false;
      this.showProfileModal = true;
    },

    filterProfiles(profiles) {
      console.log(profiles);
      this.searchResults = profiles.filter((profile) =>
        profile.value.name
          .toLowerCase()
          .includes(this.userSearchQuery.toLowerCase())
      );
      return this.searchResults;
    },

    startChat(actorURL, name) {
      const session = this.$graffitiSession.value;
      if (!session) return;
      const actors = [session.actor, actorURL].sort(); // me + recipient
      const newChat = {
        channel: actors.join("-"),
        time: Date.now(),
        name: name,
      };

      this.chats.unshift(newChat); // add to top of list
      this.currentChannel = newChat.channel;
      this.showCreateChatModal = false;
    },

    async getProfilePicture(actorURL) {
      const profile = await getProfile(actor, this.$graffiti);
      if (profile) {
        return profile.picture;
      }
      return "../assets/default-profile-pic.png";
    },
  },

  computed: {
    sortedChats() {
      return this.chats.sort((a, b) => b.time - a.time);
    },
  },
}).use(GraffitiPlugin, { graffiti: new GraffitiRemote() });

app.component("profile-summary", ProfileSummary);
console.log(app.component("profile-summary"));
app.mount("#app");
