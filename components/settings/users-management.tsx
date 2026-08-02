"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserCreateDialog } from "@/components/settings/user-create-dialog";
import { UserEditDialog } from "@/components/settings/user-edit-dialog";
import { UserPasswordDialog } from "@/components/settings/user-password-dialog";
import { MoreHorizontal, KeyRound, LogOut, Pencil, Power, PowerOff, ShieldCheck, Trash2 } from "lucide-react";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | null;
  createdAt: Date;
}

type ConfirmAction =
  | { type: "ban"; user: UserRow }
  | { type: "unban"; user: UserRow }
  | { type: "delete"; user: UserRow }
  | { type: "revoke"; user: UserRow };

export function UsersManagement() {
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.users.list.useQuery();

  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [passwordUser, setPasswordUser] = useState<UserRow | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [banReason, setBanReason] = useState("");

  const refresh = () => {
    utils.users.list.invalidate();
  };

  const banMutation = trpc.users.ban.useMutation({
    onSuccess: () => {
      toast.success("User banned");
      setConfirm(null);
      setBanReason("");
      refresh();
    },
    onError: (err) => toast.error(err.message),
  });

  const unbanMutation = trpc.users.unban.useMutation({
    onSuccess: () => {
      toast.success("User unbanned");
      setConfirm(null);
      refresh();
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMutation = trpc.users.remove.useMutation({
    onSuccess: () => {
      toast.success("User deleted");
      setConfirm(null);
      refresh();
    },
    onError: (err) => toast.error(err.message),
  });

  const revokeMutation = trpc.users.revokeSessions.useMutation({
    onSuccess: () => {
      toast.success("All sessions revoked");
      setConfirm(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const currentUserId = session?.user.id;

  const runConfirm = () => {
    if (!confirm) return;
    switch (confirm.type) {
      case "ban":
        banMutation.mutate({ userId: confirm.user.id, banReason: banReason || undefined });
        break;
      case "unban":
        unbanMutation.mutate({ userId: confirm.user.id });
        break;
      case "delete":
        removeMutation.mutate({ userId: confirm.user.id });
        break;
      case "revoke":
        revokeMutation.mutate({ userId: confirm.user.id });
        break;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Users</h2>
          <p className="text-sm text-muted-foreground">
            Manage system accounts, roles, and access
          </p>
        </div>
        <UserCreateDialog />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Created</TableHead>
              <TableHead className="w-15"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : data?.users.map((user) => {
                  const isSelf = user.id === currentUserId;
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{user.name}</span>
                          {isSelf && <Badge variant="secondary">You</Badge>}
                          {user.role === "admin" && !isSelf && (
                            <ShieldCheck className="size-3.5 text-primary" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.email}
                        {!user.emailVerified && (
                          <span className="ml-1.5 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
                            unverified
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                          {user.role ?? "user"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.banned ? (
                          <Badge variant="destructive">Banned</Badge>
                        ) : (
                          <Badge variant="outline" className="text-emerald-600">
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            }
                          ></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => setEditingUser(user)}>
                              <Pencil className="mr-2 size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPasswordUser(user)}>
                              <KeyRound className="mr-2 size-4" />
                              Reset Password
                            </DropdownMenuItem>
                            {!isSelf && (
                              <DropdownMenuItem onClick={() => setConfirm({ type: "revoke", user })}>
                                <LogOut className="mr-2 size-4" />
                                Sign Out All Sessions
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {user.banned ? (
                              <DropdownMenuItem onClick={() => setConfirm({ type: "unban", user })}>
                                <Power className="mr-2 size-4 text-emerald-500" />
                                Unban
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => {
                                  setBanReason("");
                                  setConfirm({ type: "ban", user });
                                }}
                                disabled={isSelf}
                              >
                                <PowerOff className="mr-2 size-4 text-destructive" />
                                Ban
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setConfirm({ type: "delete", user })}
                              disabled={isSelf}
                            >
                              <Trash2 className="mr-2 size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
            {!isLoading && data?.users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No users found. Create your first user.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {editingUser && (
        <UserEditDialog
          user={editingUser}
          open={!!editingUser}
          onOpenChange={(open) => {
            if (!open) setEditingUser(null);
          }}
        />
      )}

      {passwordUser && (
        <UserPasswordDialog
          user={passwordUser}
          open={!!passwordUser}
          onOpenChange={(open) => {
            if (!open) setPasswordUser(null);
          }}
        />
      )}

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.type === "ban" && `Ban ${confirm.user.name}?`}
              {confirm?.type === "unban" && `Unban ${confirm.user.name}?`}
              {confirm?.type === "delete" && `Delete ${confirm.user.name}?`}
              {confirm?.type === "revoke" && `Sign out ${confirm.user.name} from all sessions?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.type === "ban" &&
                "The user will not be able to sign in until unbanned."}
              {confirm?.type === "unban" &&
                "The user will regain the ability to sign in."}
              {confirm?.type === "delete" &&
                "The user account and all associated data will be permanently removed. This cannot be undone."}
              {confirm?.type === "revoke" &&
                "The user will be signed out of every device immediately."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {confirm?.type === "ban" && (
            <div className="space-y-1">
              <Label htmlFor="ban-reason">Reason (optional)</Label>
              <Input
                id="ban-reason"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Reason for banning"
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={confirm?.type === "delete" || confirm?.type === "ban" ? "destructive" : "default"}
              disabled={
                banMutation.isPending ||
                unbanMutation.isPending ||
                removeMutation.isPending ||
                revokeMutation.isPending
              }
              onClick={runConfirm}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
