"use strict";

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {
    const DONATION_UID = "api::donation.donation";
    const DONATION_WRITE_ACTIONS = [
      "create",
      "update",
      "delete",
      "publish",
      "unpublish",
      "discardDraft",
    ];

    strapi.documents.use(async (context, next) => {
      const result = await next();

      if (
        context.uid === DONATION_UID &&
        DONATION_WRITE_ACTIONS.includes(context.action)
      ) {
        const donations = await strapi.documents(DONATION_UID).findMany({
          status: "published",
        });
        strapi.io.emit("newDonations", donations);
      }

      return result;
    });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  // bootstrap(/*{ strapi }*/) {},
  bootstrap({ strapi }) {
    const socketUsers = {};
    const io = require("socket.io")(strapi.server.httpServer, {
      cors: {
        origin: [
          "http://localhost:3000",
          "https://l2m-db.ru",
          "https://www.l2m-db.ru",
        ],
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    io.on("connection", (socket) => {
      socket.on("join", ({ user }) => {
        socketUsers[socket.id] = user;
        io.emit("socketUsers", { socketUsers });
      });

      socket.on("auth", ({ user }) => {
        socketUsers[socket.id] = user;
        io.emit("socketUsers", { socketUsers });
      });

      socket.on("disconnect", (reason) => {
        delete socketUsers[socket.id];
        io.emit("socketUsers", { socketUsers });
      });

      socket.on("reset", () => {
        io.disconnectSockets();
      });
    });

    strapi.io = io;
  },
};
