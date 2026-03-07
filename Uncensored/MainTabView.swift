import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            HomeView()
            ThreadsView()
            // Button for new video/thread
            MessagesView()
            ProfileView()
        }
    }
}