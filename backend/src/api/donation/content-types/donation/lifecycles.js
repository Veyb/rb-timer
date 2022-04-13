module.exports = {
  async afterUpdate(event) {
    const { model } = event;
    const donations = await strapi.entityService.findMany(model.uid, {
      publicationState: "live",
    });

    strapi.io.emit("newDonations", donations);
  },
  async afterDelete(event) {
    const { model } = event;
    const donations = await strapi.entityService.findMany(model.uid, {
      publicationState: "live",
    });

    strapi.io.emit("newDonations", donations);
  },
};
