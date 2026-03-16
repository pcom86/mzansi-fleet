using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MzansiFleet.Repository.Migrations
{
    public partial class AddNextOfKinToTripPassenger : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "NextOfKinName",
                table: "TripPassengers",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NextOfKinContact",
                table: "TripPassengers",
                type: "text",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NextOfKinName",
                table: "TripPassengers");

            migrationBuilder.DropColumn(
                name: "NextOfKinContact",
                table: "TripPassengers");
        }
    }
}
