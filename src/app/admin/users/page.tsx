import UsersTable from "@/components/admin/users/UsersTable";

export const metadata = {
  title: "Users | Admin Portal",
  description: "Manage users and their roles",
};

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <UsersTable />
    </div>
  );
}

