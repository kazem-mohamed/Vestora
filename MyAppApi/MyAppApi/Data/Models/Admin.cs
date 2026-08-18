namespace MyAppApi.Data.Models
{
    // Administrator user type (TPH discriminator value "Admin").
    public class Admin : User
    {
        // The one admin who may create or remove other admins. Data-driven rather than
        // a hard-coded email: an email in code breaks the moment that address changes or
        // the account it belongs to has a problem, and it cannot be handed to someone
        // else without a deploy. Set on whoever completes Bootstrap; movable afterwards
        // only by the current primary.
        public bool IsPrimaryAdmin { get; set; }
    }
}
