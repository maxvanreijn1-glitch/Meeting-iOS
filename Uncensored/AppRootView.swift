import SwiftUI

struct AppRootView: View {
    var body: some View {
        // Logic to determine authentication state
        if isAuthenticated {
            MainTabView()
        } else {
            AuthLandingView()
        }
    }
}