import { useState } from "react"
import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {  HelpCircle, Moon,  Menu } from "lucide-react"

export default function Settings() {
  const [darkMode, setDarkMode] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className={`min-h-screen ${darkMode ? "dark" : ""}`}>
      <div className="bg-gray-100 dark:from-gray-900 dark:to-purple-900 text-foreground">
        <header className="border-b bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 text-transparent bg-clip-text">Settings</h1>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-full md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                <Menu className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full">
                <HelpCircle className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Tabs defaultValue="profile" className="space-y-8">
            <TabsList className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-1 rounded-full ${mobileMenuOpen ? 'flex flex-col' : 'hidden'} md:inline-flex md:flex-row space-y-1 md:space-y-0 md:space-x-1 w-full md:w-auto`}>
              <TabsTrigger value="profile" className="rounded-full">Profile</TabsTrigger>
              <TabsTrigger value="account" className="rounded-full">Account</TabsTrigger>
              <TabsTrigger value="automation" className="rounded-full">Automation</TabsTrigger>
              <TabsTrigger value="notifications" className="rounded-full">Notifications</TabsTrigger>
              <TabsTrigger value="security" className="rounded-full">Security</TabsTrigger>
              <TabsTrigger value="billing" className="rounded-full">Billing</TabsTrigger>
            </TabsList>
            {/* TabsContent sections remain mostly unchanged */}
            <TabsContent value="profile" className="space-y-4">
              <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80">
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your profile details here.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
                    <Avatar className="h-24 w-24 border-4 border-purple-200 dark:border-purple-700">
                      <AvatarImage src="/placeholder.svg" alt="Profile picture" />
                      <AvatarFallback>JP</AvatarFallback>
                    </Avatar>
                    <Button className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-bold py-2 px-4">
                      Change Photo
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Form fields remain the same */}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-bold py-2 px-4">
                    Save Changes
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            {/* Other TabsContent sections... */}
          </Tabs>
        </main>
        <footer className="border-t bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <Button variant="ghost" size="sm" className="text-sm">
                  Terms of Service
                </Button>
                <Button variant="ghost" size="sm" className="text-sm">
                  Privacy Policy
                </Button>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  <Switch id="darkMode" checked={darkMode} onCheckedChange={setDarkMode} />
                </div>
                <select className="text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full px-3 py-1">
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                </select>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}